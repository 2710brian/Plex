const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');

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

// --- AUTOMATISK DATABASE SETUP ---
async function setupDatabaseTables() {
    try {
        await pool.query(`CREATE TABLE IF NOT EXISTS resellers (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT, type TEXT, lang TEXT DEFAULT 'dk', status TEXT DEFAULT 'Active', access_packages TEXT);`);
        await pool.query(`CREATE TABLE IF NOT EXISTS packages (id SERIAL PRIMARY KEY, name TEXT NOT NULL, cost DECIMAL(10,2), sale_eur DECIMAL(10,2), agent_comm DECIMAL(10,2), reseller_comm DECIMAL(10,2));`);
        console.log("✅ Database tabeller er kontrolleret og klar.");
    } catch (e) { console.error("❌ Database setup fejl:", e.message); }
}
setupDatabaseTables();

// --- TELEGRAM LOGIK (BEVARET 1:1) ---
const supportToken = process.env.TELEGRAM_SUPPORT_TOKEN;
const infoToken = process.env.TELEGRAM_INFO_TOKEN;
let botSupport, botInfo;
if (supportToken) {
    botSupport = new TelegramBot(supportToken, { polling: true });
    botSupport.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const senderName = msg.from.first_name + (msg.from.last_name ? ' ' + msg.from.last_name : '');
        let content = msg.text || '';
        if (msg.photo || msg.voice || msg.video) {
            try {
                const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.voice ? msg.voice.file_id : msg.video.file_id);
                const fileType = msg.photo ? 'img' : (msg.voice ? 'voice' : 'vid');
                const filePath = await botSupport.downloadFile(fileId, uploadDir);
                content = `MEDIA|${fileType}|${path.basename(filePath)}`;
            } catch (e) { content = '[Fil modtaget]'; }
        }
        await pool.query('INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)', ['support', chatId, senderName, content, 'in']);
    });
}
if (infoToken) { botInfo = new TelegramBot(infoToken, { polling: true }); }

// --- API RUTER: KLIENTER & GODKENDELSE ---
app.get('/api/customers', async (req, res) => {
    const result = await pool.query('SELECT * FROM customers ORDER BY id ASC');
    res.json(result.rows);
});

app.post('/api/customers/save', async (req, res) => {
    const c = req.body;
    try {
        if (c.id) {
            await pool.query(`UPDATE customers SET name=$1, email=$2, mobile=$3, category=$4, status=$5, plex_id=$6, plan=$7, next_payment=$8, paid=$9, type=$10, admin_panel=$11, plex_access=$12, overseer=$13, agent=$14, cashflow_status=$15 WHERE id=$16`,
                [c.name, c.email, c.mobile, c.category, c.status, c.plex_id, c.plan, c.next_payment, c.paid, c.type, c.admin_panel, c.plex_access, c.overseer, c.agent, c.cashflow_status, c.id]);
        } else {
            await pool.query(`INSERT INTO customers (name, email, mobile, category, status, plex_id, plan, next_payment, paid, type, admin_panel, plex_access, overseer, agent, cashflow_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
                [c.name, c.email, c.mobile, c.category, c.status, c.plex_id, c.plan, c.next_payment, c.paid, c.type, c.admin_panel, c.plex_access, c.overseer, c.agent, c.cashflow_status]);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customers/delete', async (req, res) => {
    await pool.query('DELETE FROM customers WHERE id = $1', [req.body.id]);
    res.json({ success: true });
});

// --- API RUTER: RESELLER / AGENT ---
app.get('/api/resellers', async (req, res) => {
    const result = await pool.query('SELECT * FROM resellers ORDER BY id ASC');
    res.json(result.rows);
});

app.post('/api/resellers/save', async (req, res) => {
    const r = req.body;
    if (r.id) {
        await pool.query('UPDATE resellers SET name=$1, email=$2, type=$3, status=$4, access_packages=$5 WHERE id=$6', [r.name, r.email, r.type, r.status, r.access_packages, r.id]);
    } else {
        await pool.query('INSERT INTO resellers (name, email, type, status, access_packages) VALUES ($1,$2,$3,$4,$5)', [r.name, r.email, r.type, r.status, r.access_packages]);
    }
    res.json({ success: true });
});

app.post('/api/resellers/delete', async (req, res) => {
    await pool.query('DELETE FROM resellers WHERE id = $1', [req.body.id]);
    res.json({ success: true });
});

// --- API RUTER: PAKKER ---
app.get('/api/packages', async (req, res) => {
    const result = await pool.query('SELECT * FROM packages ORDER BY id ASC');
    res.json(result.rows);
});

app.post('/api/packages/save', async (req, res) => {
    const p = req.body;
    if (p.id) {
        await pool.query('UPDATE packages SET name=$1, cost=$2, sale_eur=$3, agent_comm=$4, reseller_comm=$5 WHERE id=$6', [p.name, p.cost, p.sale_eur, p.agent_comm, p.reseller_comm, p.id]);
    } else {
        await pool.query('INSERT INTO packages (name, cost, sale_eur, agent_comm, reseller_comm) VALUES ($1,$2,$3,$4,$5)', [p.name, p.cost, p.sale_eur, p.agent_comm, p.reseller_comm]);
    }
    res.json({ success: true });
});

app.post('/api/packages/delete', async (req, res) => {
    await pool.query('DELETE FROM packages WHERE id = $1', [req.body.id]);
    res.json({ success: true });
});

// --- TELEGRAM BESKEDER (HENT/SEND) ---
app.get('/api/messages', async (req, res) => {
    const result = await pool.query('SELECT * FROM telegram_messages ORDER BY created_at ASC');
    res.json(result.rows);
});

app.post('/api/send-message', async (req, res) => {
    const { chatId, text, botType } = req.body;
    const bot = (botType === 'info') ? botInfo : botSupport;
    await bot.sendMessage(chatId, text);
    await pool.query('INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)', [botType, chatId, 'Admin', text, 'out']);
    res.json({ success: true });
});

app.post('/api/send-media', upload.single('file'), async (req, res) => {
    const { chatId, type, botType } = req.body;
    const bot = (botType === 'info') ? botInfo : botSupport;
    if (type === 'img') await bot.sendPhoto(chatId, req.file.path);
    else if (type === 'vid') await bot.sendVideo(chatId, req.file.path);
    else if (type === 'voice') await bot.sendVoice(chatId, req.file.path);
    await pool.query('INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)', [botType, chatId, 'Admin', `MEDIA|${type}|${req.file.filename}`, 'out']);
    res.json({ success: true });
});

app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server kører på port ${PORT}`));
