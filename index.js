const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { useMongoAuthState } = require('./mongoStore');
const { Boom } = require('@hapi/boom');
const express = require('express');
const fs = require('fs');
const pino = require('pino');
const QRCode = require('qrcode');
const { messageHandler } = require('./messageHandler');
const logger = require('./logger');
const config = require('./config');

const app = express();
const PORT = config.webPort || 3000;
app.use(express.json());

let sock;
let qrCodeData = null;
let messageLog = [];

async function startBot() {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMongoAuthState();
    
    const baileysLogger = pino({ level: 'silent' });
    
    sock = makeWASocket({
        printQRInTerminal: true,
        auth: state,
        logger: baileysLogger,
        browser: [config.botName, "Chrome", config.botVersion],
        getMessage: async () => undefined,
        qrTimeout: 60000
    });

    // Log when QR code is received
    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if(qr) {
            logger.terminal('New QR Code received, please scan!');
            qrCodeData = qr;
        }
        
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if(shouldReconnect) {
                startBot();
            }
        } else if(connection === 'open') {
            logger.terminal('Bot Connected!');
        }
    });
    
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrCodeData = await QRCode.toDataURL(qr);
        }
        
        if (connection === 'close') {
            if (lastDisconnect.error instanceof Boom && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
                startBot();
            }
        }
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('messages.upsert', async ({ messages }) => {
        for (const message of messages) {
            if (!message.key.fromMe) {
                messageLog.push({ direction: 'incoming', message });
                await messageHandler(sock, message);
            }
        }
    });
    
    sock.ev.on('messages.update', (updates) => {
        updates.forEach(update => {
            messageLog.push({ direction: 'outgoing', update });
        });
    });
}

// Web Route to Show Status and QR Code
app.get('/status', (req, res) => {
    res.send(`<h1>${config.botName} Status</h1>
        <p>Connection: ${sock?.user ? "Connected" : "Disconnected"}</p>
        ${qrCodeData ? `<img src='${qrCodeData}'/>` : '<p>No QR Code Available</p>'}`);
});

// Web Route to View Messages
app.get('/see', (req, res) => {
    res.json(messageLog);
});

// Web Route to Send Messages
app.post('/send', async (req, res) => {
    const { number, message } = req.body;
    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }
    try {
        await sock.sendMessage(`${number}@s.whatsapp.net`, { text: message });
        res.json({ success: true, message: 'Message sent' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message', details: error });
    }
});

// Start Express Server
app.listen(PORT, () => {
    logger.info(`Web interface running at http://localhost:${PORT}`);
});

// Start Bot
startBot();
