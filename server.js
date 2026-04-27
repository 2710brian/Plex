const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
const PORT = process.env.PORT || 3000;

// Tjek om vi har en database URL
if (!process.env.DATABASE_URL) {
    console.error("❌ FEJL: DATABASE_URL mangler i Railway Variables!");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Påkrævet for Railway forbindelser udefra
});

const supportToken = process.env.TELEGRAM_SUPPORT_TOKEN;
const infoToken = process.env.TELEGRAM_INFO_TOKEN;

if (supportToken) {
    // Vi tilføjer polling_error handling for at undgå 409 crashes
    const botSupport = new TelegramBot(supportToken, { polling: true });
    console.log("Support Bot forsøger at starte... ⏳");

    botSupport.on('polling_error', (error) => {
        if (error.code !== 'ETELEGRAM' || !error.message.includes('409 Conflict')) {
            console.error("Telegram Polling Error:", error);
        }
    });

    botSupport.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const senderName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
        const text = msg.text;

        try {
            await pool.query(
                'INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)',
                ['support', chatId, senderName, text, 'in']
            );
            console.log(`✅ Besked fra ${senderName} gemt i DB`);
        } catch (err) {
            console.error('❌ Database fejl ved INSERT:', err.message);
        }
    });
}

app.use(express.static('public'));

app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM telegram_messages ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Server kører på port ${PORT}`));
