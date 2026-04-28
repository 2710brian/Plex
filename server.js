const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// DATABASE FORBINDELSE
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- 1. SIKKERHED OG LOGIN API ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM resellers WHERE email = $1 AND password = $2 AND status = \'Active\'',
            [email, password]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, message: 'Adgang nægtet' });
        }
    } catch (err) {
        console.error('Login fejl:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- 2. KUNDE ADMINISTRATION API ---
app.get('/api/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
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
    try {
        await pool.query('DELETE FROM customers WHERE id = $1', [req.body.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 3. PARTNER / RESELLER API ---
app.get('/api/resellers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM resellers ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/resellers/save', async (req, res) => {
    const r = req.body;
    try {
        if (r.id) {
            await pool.query(
                'UPDATE resellers SET name=$1, email=$2, type=$3, status=$4, access_packages=$5, menu_access=$6, password=$7 WHERE id=$8',
                [r.name, r.email, r.type, r.status, r.access_packages, r.menu_access, r.password, r.id]
            );
        } else {
            await pool.query(
                'INSERT INTO resellers (name, email, type, status, access_packages, menu_access, password) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [r.name, r.email, r.type, r.status, r.access_packages, r.menu_access, r.password]
            );
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/resellers/delete', async (req, res) => {
    try {
        await pool.query('DELETE FROM resellers WHERE id = $1', [req.body.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 4. PAKKE SYSTEM API ---
app.get('/api/packages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM packages ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/packages/save', async (req, res) => {
    const p = req.body;
    try {
        if (p.id) {
            await pool.query(
                'UPDATE packages SET name=$1, cost=$2, sale_eur=$3, agent_comm=$4, reseller_comm=$5 WHERE id=$6',
                [p.name, p.cost, p.sale_eur, p.agent_comm, p.reseller_comm, p.id]
            );
        } else {
            await pool.query(
                'INSERT INTO packages (name, cost, sale_eur, agent_comm, reseller_comm) VALUES ($1, $2, $3, $4, $5)',
                [p.name, p.cost, p.sale_eur, p.agent_comm, p.reseller_comm]
            );
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/packages/delete', async (req, res) => {
    try {
        await pool.query('DELETE FROM packages WHERE id = $1', [req.body.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 5. SERVER DRIFT & NAVIGATION ---

// Tving alle der går til hoved-URL'en til login-siden
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Tillad adgang til mappen public (billeder, styles osv)
app.use(express.static('public'));

// Alle adresser der ikke findes sendes også til login
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 CRM System kører på port ${PORT}`);
});
