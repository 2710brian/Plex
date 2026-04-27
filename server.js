const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');

// Opsætning af Multer til at håndtere fil-uploads i hukommelsen
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Database forbindelse
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Hent tokens fra Railway
const supportToken = process.env.TELEGRAM_SUPPORT_TOKEN;
const infoToken = process.env.TELEGRAM_INFO_TOKEN;

let botSupport, botInfo;

if (supportToken) {
    botSupport = new TelegramBot(supportToken, { polling: true });
    console.log("Support Bot Online ✅");

    botSupport.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const senderName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
        try {
            await pool.query(
                'INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)',
                ['support', chatId, senderName, msg.text || '[Medie/Fil]', 'in']
            );
        } catch (err) { console.error('Database INSERT fejl:', err.message); }
    });
}

if (infoToken) {
    botInfo = new TelegramBot(infoToken, { polling: true });
    console.log("Info Bot Online ✅");
}

// --- API RUTER ---

// Hent alle beskeder
app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM telegram_messages ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Send tekst-besked
app.post('/api/send-message', async (req, res) => {
    const { chatId, text, botType } = req.body;
    const bot = (botType === 'info') ? botInfo : botSupport;
    
    try {
        await bot.sendMessage(chatId, text);
        await pool.query(
            'INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)',
            [botType, chatId, 'Admin', text, 'out']
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// SEND FILER, VIDEO & VOICE (Den vigtige del!)
app.post('/api/send-media', upload.single('file'), async (req, res) => {
    const { chatId, type, botType } = req.body;
    const file = req.file;
    const bot = (botType === 'info') ? botInfo : botSupport;

    try {
        if (type === 'img') {
            await bot.sendPhoto(chatId, file.buffer);
        } else if (type === 'vid') {
            await bot.sendVideo(chatId, file.buffer);
        } else if (type === 'voice') {
            await bot.sendVoice(chatId, file.buffer);
        }

        await pool.query(
            'INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)',
            [botType, chatId, 'Admin', `[Sendt ${type}]`, 'out']
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Media send fejl:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Server kører på port ${PORT}`));
