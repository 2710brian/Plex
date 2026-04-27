const express = require('express');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const PORT = process.env.PORT || 3000;

// Hent tokens fra Railway Variables
const supportToken = process.env.TELEGRAM_SUPPORT_TOKEN;
const infoToken = process.env.TELEGRAM_INFO_TOKEN;

// Initialiser bots (kun hvis tokens findes)
let botSupport, botInfo;

if (supportToken) {
    botSupport = new TelegramBot(supportToken, { polling: true });
    console.log("Support Bot Online ✅");
    
    // Når botten modtager en besked
    botSupport.on('message', (msg) => {
        console.log(`Besked modtaget på Support fra ${msg.from.first_name}: ${msg.text}`);
        // Her vil vi senere gemme i databasen
    });
}

if (infoToken) {
    botInfo = new TelegramBot(infoToken, { polling: true });
    console.log("Info Bot Online ✅");
}

app.use(express.static('public'));

// Ruter til siderne
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/approvals.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'approvals.html')));
app.get('/resellers.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'resellers.html')));
app.get('/commission.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'commission.html')));
app.get('/settings.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'settings.html')));
app.get('/telegram.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'telegram.html')));

app.listen(PORT, () => {
    console.log(`Server kører på port ${PORT}`);
});
