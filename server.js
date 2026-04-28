const express = require('express');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const TelegramBot = require('node-telegram-bot-api');
const multer = require('multer');

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) { fs.mkdirSync(uploadDir, { recursive: true }); }

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- AUTOMATISK DATABASE SETUP (Kører ved hver opstart) ---
async function setupDatabase() {
    try {
        // Opret Resellers tabel hvis den ikke findes
        await pool.query(`
            CREATE TABLE IF NOT EXISTS resellers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                type TEXT,
                lang TEXT DEFAULT 'dk',
                status TEXT DEFAULT 'Active',
                access_packages TEXT
            );
        `);
        console.log("✅ Database tabeller er kontrolleret og klar.");
    } catch (e) {
        console.error("❌ Fejl ved oprettelse af tabeller:", e.message);
    }
}
setupDatabase();

// --- RESELLER / PARTNER API ---
app.get('/api/resellers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM resellers ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/resellers/save', async (req, res) => {
    const { id, name, email, type, status } = req.body;
    try {
        if (id) {
            await pool.query(
                'UPDATE resellers SET name=$1, email=$2, type=$3, status=$4 WHERE id=$5',
                [name, email, type, status, id]
            );
        } else {
            await pool.query(
                'INSERT INTO resellers (name, email, type, status) VALUES ($1, $2, $3, $4)',
                [name, email, type, status]
            );
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/resellers/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query('DELETE FROM resellers WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- KUNDE & TELEGRAM API (Beholdes intakt) ---
app.get('/api/customers', async (req, res) => {
    const r = await pool.query('SELECT * FROM customers ORDER BY id ASC');
    res.json(r.rows);
});

app.get('/api/messages', async (req, res) => {
    const r = await pool.query('SELECT * FROM telegram_messages ORDER BY created_at ASC');
    res.json(r.rows);
});

app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Server kører på port ${PORT}`));
