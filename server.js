const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');

// Opret uploads mappe hvis den ikke findes
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})});

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const supportToken = process.env.TELEGRAM_SUPPORT_TOKEN;
const infoToken = process.env.TELEGRAM_INFO_TOKEN;
let botSupport, botInfo;

if (supportToken) {
    botSupport = new TelegramBot(supportToken, { polling: true });
    botSupport.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const senderName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
        let content = msg.text || '';

        // Håndtering af indkommende billeder/voice fra kunden
        if (msg.photo || msg.voice || msg.video) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.voice ? msg.voice.file_id : msg.video.file_id);
            const fileType = msg.photo ? 'img' : (msg.voice ? 'voice' : 'vid');
            const filePath = await botSupport.downloadFile(fileId, uploadDir);
            content = `MEDIA|${fileType}|${path.basename(filePath)}`;
        }

        try {
            await pool.query(
                'INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)',
                ['support', chatId, senderName, content, 'in']
            );
        } catch (err) { console.error('DB Error:', err.message); }
    });
}

if (infoToken) { botInfo = new TelegramBot(infoToken, { polling: true }); }

app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM telegram_messages ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/send-message', async (req, res) => {
    const { chatId, text, botType } = req.body;
    const bot = (botType === 'info') ? botInfo : botSupport;
    try {
        await bot.sendMessage(chatId, text);
        await pool.query('INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)', [botType, chatId, 'Admin', text, 'out']);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/send-media', upload.single('file'), async (req, res) => {
    const { chatId, type, botType } = req.body;
    const bot = (botType === 'info') ? botInfo : botSupport;
    const fileName = req.file.filename;

    try {
        if (type === 'img') await bot.sendPhoto(chatId, req.file.path);
        else if (type === 'vid') await bot.sendVideo(chatId, req.file.path);
        else if (type === 'voice') await bot.sendVoice(chatId, req.file.path);

        await pool.query('INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)', 
            [botType, chatId, 'Admin', `MEDIA|${type}|${fileName}`, 'out']);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server kører på port ${PORT}`));
