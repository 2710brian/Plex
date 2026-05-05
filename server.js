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

// --- 1. LOGIN API ---
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM resellers WHERE email = $1 AND password = $2 AND status = \'Active\'',
            [email, password]
        );
        if (result.rows.length > 0) res.json({ success: true, user: result.rows[0] });
        else res.status(401).json({ success: false });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 2. KUNDE / KLIENT API ---
app.get('/api/customers', async (req, res) => {
    try { const result = await pool.query('SELECT * FROM customers ORDER BY name ASC'); res.json(result.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers/save', async (req, res) => {
    const c = req.body;
    try {
        if (c.id) {
            await pool.query(`UPDATE customers SET name=$1, email=$2, mobile=$3, category=$4, status=$5, plex_id=$6, plan=$7, next_payment=$8, paid=$9, type=$10, admin_panel=$11, plex_access=$12, overseer=$13, agent=$14, cashflow_status=$15, salutation=$16, country=$17, gender=$18, language=$19, sub_category=$20, login_allowed=$21, email_notifications=$22, created_date=$23, company_name=$24, website=$25, tax_id=$26, address=$27, mac=$28, app=$29 WHERE id=$30`,
                [c.name, c.email, c.mobile, c.category, c.status, c.plex_id, c.plan, c.next_payment, c.paid, c.type, c.admin_panel, c.plex_access, c.overseer, c.agent, c.cashflow_status, c.salutation, c.country, c.gender, c.language, c.sub_category, c.login_allowed, c.email_notifications, c.created_date, c.company_name, c.website, c.tax_id, c.address, c.mac, c.app, c.id]);
        } else {
            await pool.query(`INSERT INTO customers (name, email, mobile, category, status, plex_id, plan, next_payment, paid, type, admin_panel, plex_access, overseer, agent, cashflow_status, salutation, country, gender, language, sub_category, login_allowed, email_notifications, created_date, company_name, website, tax_id, address, mac, app) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
                [c.name, c.email, c.mobile, c.category, c.status, c.plex_id, c.plan, c.next_payment, c.paid, c.type, c.admin_panel, c.plex_access, c.overseer, c.agent, c.cashflow_status, c.salutation, c.country, c.gender, c.language, c.sub_category, c.login_allowed, c.email_notifications, c.created_date, c.company_name, c.website, c.tax_id, c.address, c.mac, c.app]);
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customers/delete', async (req, res) => {
    try { await pool.query('DELETE FROM customers WHERE id = $1', [req.body.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 3. RESELLER / PARTNER API ---
app.get('/api/resellers', async (req, res) => {
    try { const result = await pool.query('SELECT * FROM resellers ORDER BY id ASC'); res.json(result.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/resellers/save', async (req, res) => {
    const r = req.body;
    try {
        if (r.id) {
            await pool.query('UPDATE resellers SET name=$1, email=$2, type=$3, status=$4, access_packages=$5, menu_access=$6, password=$7 WHERE id=$8', [r.name, r.email, r.type, r.status, r.access_packages, r.menu_access, r.password, r.id]);
        } else {
            await pool.query('INSERT INTO resellers (name, email, type, status, access_packages, menu_access, password) VALUES ($1,$2,$3,$4,$5,$6,$7)', [r.name, r.email, r.type, r.status, r.access_packages, r.menu_access, r.password]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/resellers/delete', async (req, res) => {
    try { await pool.query('DELETE FROM resellers WHERE id = $1', [req.body.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 4. PAKKE SYSTEM API ---
app.get('/api/packages', async (req, res) => {
    try { const result = await pool.query('SELECT * FROM packages ORDER BY id ASC'); res.json(result.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/packages/save', async (req, res) => {
    const p = req.body;
    try {
        if (p.id) {
            await pool.query('UPDATE packages SET name=$1, cost=$2, sale_eur=$3, agent_comm=$4, reseller_comm=$5 WHERE id=$6', [p.name, p.cost, p.sale_eur, p.agent_comm, p.reseller_comm, p.id]);
        } else {
            await pool.query('INSERT INTO packages (name, cost, sale_eur, agent_comm, reseller_comm) VALUES ($1, $2, $3, $4, $5)', [p.name, p.cost, p.sale_eur, p.agent_comm, p.reseller_comm]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/packages/delete', async (req, res) => {
    try { await pool.query('DELETE FROM packages WHERE id = $1', [req.body.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 5. BETALINGS API ---
app.get('/api/payments', async (req, res) => {
    try { const result = await pool.query('SELECT * FROM payments ORDER BY payment_date DESC'); res.json(result.rows); } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/payments/save', async (req, res) => {
    const { customer_name, amount_eur, method, agent_name } = req.body;
    try { await pool.query('INSERT INTO payments (customer_name, amount_eur, method, agent_name) VALUES ($1, $2, $3, $4)', [customer_name, amount_eur, method, agent_name]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// NY TILFØJELSE: Sletning af betalinger
app.post('/api/payments/delete', async (req, res) => {
    try { await pool.query('DELETE FROM payments WHERE id = $1', [req.body.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- 6. NAVIGATION OG START-SIDE ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.listen(PORT, () => console.log(`🚀 CRM Master Server kører på port ${PORT}`));
