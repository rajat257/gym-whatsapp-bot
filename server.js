const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

let qrCodeData = '';
let isReady = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrCodeData = qr;
    isReady = false;
    console.log('QR Code received, scan it on /qr URL');
});

client.on('ready', () => {
    isReady = true;
    qrCodeData = '';
    console.log('WhatsApp is ready!');
});

client.initialize();

// Web route to view QR code for scanning
app.get('/qr', async (req, res) => {
    if (isReady) {
        return res.send('<h2 style="color: green; text-align: center; margin-top: 50px;">WhatsApp is already Connected and Ready! ✅</h2>');
    }
    if (!qrCodeData) {
        return res.send('<h3 style="text-align: center; margin-top: 50px;">Generating QR code, please refresh the page in 5-10 seconds... 🔄</h3>');
    }
    try {
        const url = await qrcode.toDataURL(qrCodeData);
        res.send(`
            <div style="text-align: center; margin-top: 50px;">
                <h2>Scan this QR Code with your Gym WhatsApp</h2>
                <img src="${url}" alt="WhatsApp QR Code" style="width: 300px; height: 300px;"/>
                <p>Refresh this page if the QR code expires.</p>
            </div>
        `);
    } catch (err) {
        res.status(500).send('Error generating QR code');
    }
});

// API endpoint for InfinityFree PHP to trigger message
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Phone aur message dono zaroori hain!' });
    }

    if (!isReady) {
        return res.status(500).json({ success: false, error: 'WhatsApp connected nahi hai! Pehle /qr URL par jakar QR scan karein.' });
    }

    try {
        const formattedPhone = phone.includes('@c.us') ? phone : `${phone}@c.us`;
        await client.sendMessage(formattedPhone, message);
        res.json({ success: true, message: 'Message safaltapoorvak bhej diya gaya!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
