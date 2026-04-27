const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json()); // Gør serveren i stand til at læse tekst sendt fra din browser
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const supportToken = process.env.TELEGRAM_SUPPORT_TOKEN;
let botSupport;

if (supportToken) {
    botSupport = new TelegramBot(supportToken, { polling: true });
    console.log("Support Bot Aktiv ✅");

    // MODTAG BESKED FRA KUNDE
    botSupport.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const senderName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
        try {
            await pool.query(
                'INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)',
                ['support', chatId, senderName, msg.text || '[Fil/Billede]', 'in']
            );
        } catch (err) { console.error('DB Fejl:', err.message); }
    });
}

// API: HENT BESKED-HISTORIK
app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM telegram_messages ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: SEND BESKED TIL KUNDE (Fra dit dashboard)
app.post('/api/send-message', async (req, res) => {
    const { chatId, text } = req.body;
    try {
        await botSupport.sendMessage(chatId, text); // Send via Telegram
        await pool.query(
            'INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)',
            ['support', chatId, 'Admin', text, 'out'] // Gem som udegående i DB
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Server kører på port ${PORT}`));
