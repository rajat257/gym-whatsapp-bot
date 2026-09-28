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

console.log('Initializing WhatsApp Client...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    }
});

client.on('qr', (qr) => {
    qrCodeData = qr;
    isReady = false;
    console.log('--- NEW QR CODE RECEIVED ---');
});

client.on('authenticated', () => {
    console.log('✅ WhatsApp Authenticated Successfully!');
    // Forcefully ready mark kar rahe hain taaki state stuck na ho
    isReady = true;
    qrCodeData = '';
});

client.on('auth_failure', (msg) => {
    console.error('❌ WhatsApp Authentication Failed:', msg);
    isReady = false;
});

client.on('ready', () => {
    isReady = true;
    qrCodeData = '';
    console.log('🚀 WhatsApp is fully Ready and Connected!');
});

client.on('disconnected', (reason) => {
    isReady = false;
    console.log('⚠️ WhatsApp Disconnected:', reason);
});

client.initialize().catch(err => {
    console.error('❌ Failed to initialize WhatsApp client:', err);
});

app.get('/qr', async (req, res) => {
    if (isReady) {
        return res.send('<h2 style="color: green; text-align: center; margin-top: 50px;">WhatsApp is already Connected and Ready! ✅</h2>');
    }
    if (!qrCodeData) {
        return res.send('<h3 style="text-align: center; margin-top: 50px;">Generating QR code or waiting... Please refresh in 10 seconds. 🔄</h3>');
    }
    try {
        const url = await qrcode.toDataURL(qrCodeData);
        res.send(`
            <div style="text-align: center; margin-top: 50px;">
                <h2>Scan this QR Code with your Gym WhatsApp</h2>
                <img src="${url}" alt="WhatsApp QR Code" style="width: 300px; height: 300px;"/>
                <p>Refresh this page after scanning.</p>
            </div>
        `);
    } catch (err) {
        res.status(500).send('Error generating QR code');
    }
});

app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'Phone aur message dono zaroori hain!' });
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
