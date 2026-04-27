const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Database forbindelse (Railway udfylder selv DATABASE_URL)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Hent tokens fra Railway Variables
const supportToken = process.env.TELEGRAM_SUPPORT_TOKEN;
const infoToken = process.env.TELEGRAM_INFO_TOKEN;

let botSupport;

if (supportToken) {
    botSupport = new TelegramBot(supportToken, { polling: true });
    console.log("Support Bot Online ✅");

    // MODTAG BESKED OG GEM I DATABASE
    botSupport.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const senderName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
        const text = msg.text;

        try {
            await pool.query(
                'INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)',
                ['support', chatId, senderName, text, 'in']
            );
            console.log(`Besked fra ${senderName} gemt i databasen.`);
        } catch (err) {
            console.error('Fejl ved gem i DB:', err);
        }
    });
}

// API rute til at hente beskeder til din hjemmeside
app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM telegram_messages ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use(express.static('public'));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/approvals.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'approvals.html')));
app.get('/resellers.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'resellers.html')));
app.get('/commission.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'commission.html')));
app.get('/settings.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/telegram.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'telegram.html')));

app.listen(PORT, () => console.log(`Server kører på port ${PORT}`));
