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

// DATABASE INITIALISERING - Sikrer at alle kolonner findes
async function initializeDatabase() {
    try {
        // Tjek og tilføj manglende kolonner til customers tabel
        const columnsToAdd = [
            { name: 'salutation', type: 'VARCHAR(10)' },
            { name: 'country', type: 'VARCHAR(100)' },
            { name: 'gender', type: 'VARCHAR(20)' },
            { name: 'language', type: 'VARCHAR(50)' },
            { name: 'sub_category', type: 'VARCHAR(255)' },
            { name: 'login_allowed', type: 'VARCHAR(10)' },
            { name: 'email_notifications', type: 'VARCHAR(10)' },
            { name: 'created_date', type: 'VARCHAR(50)' },
            { name: 'company_name', type: 'VARCHAR(255)' },
            { name: 'website', type: 'VARCHAR(255)' },
            { name: 'tax_id', type: 'VARCHAR(100)' },
            { name: 'address', type: 'TEXT' },
            { name: 'mac', type: 'VARCHAR(255)' },
            { name: 'app', type: 'VARCHAR(255)' }
        ];

        for (const col of columnsToAdd) {
            try {
                await pool.query(`ALTER TABLE customers ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✓ Kolonne tilføjet: ${col.name}`);
            } catch (err) {
                if (err.message.includes('already exists')) {
                    // Kolonne findes allerede, det er OK
                } else {
                    console.log(`⚠ Kunne ikke tilføje ${col.name}: ${err.message}`);
                }
            }
        }
    } catch (err) {
        console.error('Database initialisering fejl:', err.message);
    }
}

// Kør database initialisering når serveren starter
initializeDatabase();

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
            // Opdater kun de felter der er defineret
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            
            const fieldMap = {
                name: c.name, email: c.email, mobile: c.mobile, category: c.category,
                status: c.status, plex_id: c.plex_id, plan: c.plan, next_payment: c.next_payment,
                paid: c.paid, type: c.type, admin_panel: c.admin_panel, plex_access: c.plex_access,
                overseer: c.overseer, agent: c.agent, cashflow_status: c.cashflow_status,
                salutation: c.salutation, country: c.country, gender: c.gender, language: c.language,
                sub_category: c.sub_category, login_allowed: c.login_allowed,
                email_notifications: c.email_notifications, created_date: c.created_date,
                company_name: c.company_name, website: c.website, tax_id: c.tax_id,
                address: c.address, mac: c.mac, app: c.app
            };
            
            for (const [field, value] of Object.entries(fieldMap)) {
                if (value !== undefined && value !== null) {
                    updateFields.push(`${field}=$${paramIndex++}`);
                    values.push(value);
                }
            }
            
            values.push(c.id);
            const query = `UPDATE customers SET ${updateFields.join(', ')} WHERE id=$${paramIndex}`;
            await pool.query(query, values);
        } else {
            await pool.query(`INSERT INTO customers (name, email, mobile, category, status, plex_id, plan, next_payment, paid, type, admin_panel, plex_access, overseer, agent, cashflow_status, salutation, country, gender, language, sub_category, login_allowed, email_notifications, created_date, company_name, website, tax_id, address, mac, app) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)`,
                [c.name, c.email, c.mobile, c.category, c.status, c.plex_id, c.plan, c.next_payment, c.paid, c.type, c.admin_panel, c.plex_access, c.overseer, c.agent, c.cashflow_status, c.salutation, c.country, c.gender, c.language, c.sub_category, c.login_allowed, c.email_notifications, c.created_date, c.company_name, c.website, c.tax_id, c.address, c.mac, c.app]);
        }
        res.json({ success: true });
    } catch (e) { 
        console.error('Fejl ved gemning af kunde:', e.message);
        res.status(500).json({ error: e.message }); 
    }
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
