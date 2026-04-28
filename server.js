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

// --- IMPORT FUNKTION: INDSÆTTER ALLE 63 KUNDER ---
async function initialImport() {
    const csvData = [
        ['29821','Mr Mads Aggerholm Munch Lange','shin@shinhypnose.dk','--','Full Packet','Active','27-01-2026','sh2183','Yearly','18-01-2027','Ja','IP-Movie','N','Y','Y','KU'],
        ['29818','Mr Martin Nielsen','martin@martketingspusher.dk','--','Full Packet','Active','26-01-2026','mar15790','Yearly','05-01-2027','Ja','IP-Movie','N','Y','Y','BH'],
        ['29718','Mrs Camilla','Cadasal20@gmail.com','--','Plex','Active','22-12-2025','cada877','Yearly','21-12-2026','Ja','Movie','Y','Y','Y','BH'],
        ['29700','Mrs Anette','','+45 28449243','Full Packet','Active','07-12-2025','Anette','Yearly','22-01-2027','Ja','IP-Movie','N','N','N','BH'],
        ['28473','Mr Teddy Hansen','','--','Hosting+','Active','06-11-2025','00','Monthly','01-06-2026','Ja','IP','N','N','N','BH'],
        ['28472','Mr Alex Nielsen','holli@marketinggroupmalaga.com','--','Hosting+','Active','06-11-2025','Hola312','Free plan','31-12-2026','Ja','IP-Movie','N','N','N','BH'],
        ['28471','Mr Daniel Soler','','--','Hosting+','Active','06-11-2025','00','Monthly','01-12-2025','Ja','IP','N','N','N','BH'],
        ['28470','Mrs Lisa Olsen','','--','Hosting+','Active','06-11-2025','00','Monthly','01-02-2026','Ja','IP','N','N','N','BH'],
        ['28469','Mr Kællder Brian','sales@gclibertad.com','+34 602057586','Hosting+','Active','06-11-2025','00','Free plan','31-12-2026','Ja','IP-Movie','N','N','N','BH'],
        ['28468','Mr Alberto','arrn.dk@gmail.com','--','Plex','Active','06-11-2025','ReyOnHisWayToTheMoon','Yearly','28-02-2026','Ja','Movie','Y','Y','N','KU'],
        ['28467','Mr Sonny Curtis','casa.curtis77@gmail.com','--','Plex','Active','06-11-2025','Casa.Cu','Yearly','20-08-2026','Ja','Movie','Y','Y','N','KU'],
        ['28466','Mr Jesper Torp','Torp86@live.dk','--','Plex','Active','06-11-2025','tor5103','Yearly','02-05-2026','Ja','Movie','Y','N','N','BH'],
        ['28465','Mr Andreas Ryborg','andreasrgborg1@gmail.com','--','Internet Client','Active','06-11-2025','andreas8670','Yearly','28-02-2026','Ja','Movie','Y','N','N','--'],
        ['28464','Mr Allan Egesholm','Egesholm@gmail.com','--','Plex','Active','06-11-2025','Allan Egesholm','Yearly','28-02-2026','Ja','Movie','Y','Y','N','KU'],
        ['28463','Mr Jimi Voodoo Salih','jimisalih4@gmail.com','--','Plex','Active','06-11-2025','jimis24','Yearly','01-03-2026','Ja','Movie','Y','Y','N','BH'],
        ['28462','Mr Halil Akbulut','Minaakbulut5858@gmail.com','--','Plex','Active','06-11-2025','minaakbu','Yearly','01-03-2026','Ja','Movie','Y','Y','N','KU'],
        ['28461','Mr Danny Jensen','The.suicidalbird@gmail.com','--','Plex','Active','06-11-2025','TheMovieWatcherNow','Yearly','28-02-2026','Ja','Movie','Y','Y','N','KU'],
        ['28460','Mr Ali Reza','shakhsi420@gmail.com','--','Plex','Active','06-11-2025','Alaki Alaki','Yearly','31-03-2026','Ja','Movie','Y','Y','N','KU'],
        ['28459','Mr Martin Jørgensen','boffen_bof@hotmail.com','--','Plex','Active','06-11-2025','boeffe21','Yearly','28-02-2027','Ja','Movie','Y','N','N','KU'],
        ['28458','Mr PoulK56','poulk6104@gmail.com','--','Plex','Active','06-11-2025','Poulk56','Yearly','28-06-2026','Ja','Movie','Y','Y','Y','KU'],
        ['28457','Mr Jonas','Jonas.a.taha@gmail.com','--','Plex','Inactive','06-11-2025','eazydrop','Yearly','01-03-2026','Ja','Movie','Y','Y','Y','KU'],
        ['28456','Mr Michael Post Tønder','michaelptonder@gmail.com','--','Plex','Active','06-11-2025','michaeltnder','Yearly','28-02-2026','Ja','Movie','Y','Y','N','KU'],
        ['28455','Mr Willi Seidel Rouanina','wrouainia@gmail.com','--','Plex','Active','06-11-2025','willirouainia','Yearly','01-09-2026','Ja','Movie','Y','Y','N','KU'],
        ['28454','Mrs Rikke - Willi Seidel Rouanina','rikkemus7@gmail.com','--','Plex','Active','06-11-2025','rikke82','Yearly','01-09-2026','Nej','Movie','Y','Y','N','BH'],
        ['28453','Mr Jesper Petersen','j.n.petersen@live.dk','--','Plex','Active','06-11-2025','j.n.pe','Yearly','31-10-2026','Ja','Movie','Y','Y','N','KU'],
        ['28452','Mr Andrias Lott-Haar','Andriaslh@outlook.com','--','Plex','Inactive','06-11-2025','Andri383','Monthly','30-01-2026','Ja','Movie','Y','Y','N','KU'],
        ['28451','Mrs Djinnie','djinnie.fodbold@gmail.com','--','Plex','Inactive','06-11-2025','djinnie.','Monthly','30-12-2025','Ja','Movie','Y','Y','N','KU'],
        ['28450','Mrs Rikke Vogt','Rikkevogt2610@gmail.com','--','Plex','Active','06-11-2025','jp5b7','Monthly','01-04-2026','Ja','Movie','Y','Y','N','KU'],
        ['28449','Mr Mert Rasim Akbulut','mert@akbulut.dk','--','Plex','Active','06-11-2025','me8679','Monthly','19-03-2026','Ja','Movie','Y','N','N','BH'],
        ['28448','Mrs Emma Lundberg','emmalundberg123@gmail.com','--','Plex','Inactive','06-11-2025','Emmalundberg07','Monthly','30-12-2025','Nej','Movie','Y','Y','N','BH'],
        ['28447','Mr Humair Habib','humairhabib@hotmail.com','--','Plex','Inactive','06-11-2025','humair36','Monthly','31-10-2025','Nej','Movie','Y','N','N','BH'],
        ['28446','Mrs Isabella Mandal Jørgensen','Isabellamandaljensen@gmail.com','--','Plex','Inactive','06-11-2025','00','Monthly','02-10-2025','Nej','Movie','Y','N','N','BH'],
        ['28445','Mr Jeppe hansen','familien.boejen.kjelsmark@gmail.com','--','Plex','Inactive','06-11-2025','0','Monthly','31-07-2025','Nej','Movie','N','N','N','BH'],
        ['28443','Mr Oliver Uldahl','oliveruldahl@gmail.com','--','Plex','Inactive','06-11-2025','Uldahl4700','Monthly','30-11-2025','Ja','Movie','Y','N','N','KU'],
        ['28442','Mr Michael Desbo Riel','film4alle@gmail.com','--','Plex','Inactive','06-11-2025','Movies4all609','Monthly','30-01-2026','Ja','Movie','Y','N','N','KU'],
        ['28441','Mr Anas Loubani','loubani.anas@hotmail.com','--','Plex','Inactive','06-11-2025','louban','Monthly','30-11-2025','Ja','Movie','Y','Y','N','BH'],
        ['28440','Mrs Anette Nielsen (1) via RHN','Annettenielsen4@me.com','--','Plex','Inactive','06-11-2025','annetten27','Monthly','30-12-2025','Ja','Movie','Y','Y','N','KU'],
        ['28438','Mrs Xenia Emilie Petersen','xenia-petersen@hotmail.com','--','Plex','Inactive','06-11-2025','xeniape','Monthly','30-12-2025','Ja','Movie','Y','Y','N','KU'],
        ['28436','Mr Daniel Jensen','danieljensen081@gmail.com','--','Plex','Active','06-11-2025','danieljensen296','Monthly','30-01-2026','Ja','Movie','Y','Y','N','BH'],
        ['28434','Mrs Marie Louise Mobeck','Mariemobeck@gmail.com','--','Plex','Inactive','06-11-2025','00','Monthly','01-08-2025','Nej','Movie','N','N','N','KU'],
        ['28432','Mr Oliver Holm Paulsen','Oliholmpaulsen@gmail.com','--','Plex','Inactive','06-11-2025','oliverpaulsen','Monthly','30-12-2025','Ja','Movie','Y','Y','N','KU'],
        ['28431','Mr Henrik Andersen','bombom768@gmail.com','--','Full Packet','Active','06-11-2025','Bombom1000','Monthly','01-04-2026','Ja','IP-Movie','Y','Y','N','KU'],
        ['28430','Mrs Junaid Nayyar','junni.nayyar@gmail.com','--','Plex','Active','06-11-2025','junni86','Monthly','30-01-2026','Ja','Movie','Y','N','N','KU'],
        ['28429','Mr Dennis Frost','dennisfrost2@gmail.com','--','Plex','Active','06-11-2025','dennisfrost603','Yearly','01-04-2026','Ja','Movie','Y','Y','N','BH'],
        ['28428','Mr Rasmus Holm Nielsen (2)','Rasmushnielsen@live.dk','--','Plex','Inactive','06-11-2025','rasmush81','Monthly','30-12-2025','Ja','Movie','Y','Y','N','KU'],
        ['28427','Mrs Pia Heidemann','Luxen@hotmail.dk','--','Plex','Inactive','06-11-2025','lux458','3 Months','30-01-2026','Ja','Movie','Y','N','N','BH'],
        ['28426','Mr Ahmad A. Aisheh','llyasabuaisheh@gmail.com','--','Plex','Active','06-11-2025','ahmadabuaisheh132','Monthly','02-02-2027','Nej','Movie','Y','Y','N','KU'],
        ['28425','Mr Sagi Saglanmak','saglanmak@outlook.com','--','Plex','Active','06-11-2025','sagla7','Monthly','28-03-2026','Ja','Movie','Y','Y','N','KU'],
        ['28423','Mr Ome Moh','omacph@gmail.com','--','Plex','Inactive','06-11-2025','Omacph','Monthly','30-12-2025','Nej','Movie','Y','Y','N','KU'],
        ['28422','Mr Shoaib Mansoor','shoaib.88@hotmail.com','--','Plex','Inactive','06-11-2025','shoai207','Monthly','31-10-2025','Nej','Movie','Y','N','N','KU'],
        ['28421','Mr Claus Blok','cb@ecoflexdesign.dk','--','Plex','Active','06-11-2025','chendrikblok','Monthly','01-04-2026','Ja','Movie','Y','Y','Y','BH'],
        ['28418','Mr Fernando  Brian (1)','fernandoB1903@marketinggroupmalaga.com','--','Full Packet','Active','06-11-2025','fernand4084','Yearly','16-09-2026','Ja','IP-Movie','Y','N','N','BH'],
        ['28417','Mr Kim Jensen / Brian Hald (2)','support3@euromarketmalaga.com','--','Full Packet','Active','06-11-2025','00','Yearly','26-08-2026','Ja','IP-Movie','N','N','N','BH'],
        ['28416','Mr Jimmy/Brian Hald (3)','support4@euromarketmalaga.com','--','Full Packet','Inactive','06-11-2025','Supp4671','Free plan','06-11-2025','Ja','Movie','Y','N','N','BH'],
        ['28415','Mr GVBH1-Brian Hald (4)','support@euromarketmalaga.com','--','Full Packet','Active','06-11-2025','supp526','Free plan','31-12-2026','Ja','IP-Movie','Y','N','N','BH'],
        ['28414','Mr Kurt & Laila -Brian Hald (5)','support1@euromarketmalaga.com','--','Full Packet','Active','06-11-2025','supp8776','Free plan','01-08-2026','Ja','IP-Movie','Y','N','N','BH'],
        ['28413','Mr Flemming Thinggaard','flemmingthinggaard78@gmail.com','--','Plex','Active','06-11-2025','flemmingth','Free plan','31-12-2026','Ja','Movie','Y','Y','N','KU'],
        ['28412','Mr Thomas Uldahl','thomasu1978@gmail.com','--','Plex','Active','06-11-2025','thomas7797','Yearly','31-12-2026','Ja','Movie','Y','Y','N','BH'],
        ['28411','Mr Kim Uldahl','kimuldahl@mail.dk','--','Full Packet','Active','06-11-2025','stammerjohan','Monthly','31-12-2026','Ja','Movie','Y','N','N','KU'],
        ['28410','Mr Sixpix Main','sixpix@vip.cybercity.dk','--','Plex','Active','06-11-2025','sixpix19','Free plan','31-12-2026','Ja','Movie','Y','Y','N','KU'],
        ['28409','Mr Silas','silasbuh@hotmail.com','--','Plex','Active','06-11-2025','silasbuch','Free plan','31-12-2026','Ja','Movie','Y','Y','N','KU'],
        ['28408','Mr Nico Semi','nhdesign92@gmail.com','--','Full Packet','Active','06-11-2025','NicoSemi','Free plan','31-12-2026','Ja','IP-Movie','Y','N','N','BH'],
        ['28407','Mr Brian (MAIN)','info@flexinet-europe.com','--','Full Packet','Active','06-11-2025','in34377','Free plan','31-12-2026','Ja','IP-Movie','Y','Y','Y','BH']
    ];

    try {
        const check = await pool.query('SELECT count(*) FROM customers');
        if (parseInt(check.rows[0].count) === 0) {
            console.log("Database tom. Importerer 63 kunder...");
            for (const row of csvData) {
                await pool.query(
                    `INSERT INTO customers (customer_id, name, email, mobile, category, status, created_date, plex_id, plan, next_payment, paid, type, admin_panel, plex_access, overseer, agent) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, row
                );
            }
            console.log("✅ Fuld import gennemført!");
        }
    } catch (e) { console.error("Import fejl:", e.message); }
}
initialImport();

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

// API: HENT KUNDER
app.get('/api/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM customers ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: HENT TELEGRAM BESKEDER
app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM telegram_messages ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: SEND TELEGRAM BESKED
app.post('/api/send-message', async (req, res) => {
    const { chatId, text, botType } = req.body;
    const bot = (botType === 'info') ? botInfo : botSupport;
    try {
        await bot.sendMessage(chatId, text);
        await pool.query('INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)', [botType, chatId, 'Admin', text, 'out']);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// API: SEND MEDIA (FILER)
app.post('/api/send-media', upload.single('file'), async (req, res) => {
    const { chatId, type, botType } = req.body;
    const bot = (botType === 'info') ? botInfo : botSupport;
    try {
        if (type === 'img') await bot.sendPhoto(chatId, req.file.path);
        else if (type === 'vid') await bot.sendVideo(chatId, req.file.path);
        else if (type === 'voice') await bot.sendVoice(chatId, req.file.path);
        await pool.query('INSERT INTO telegram_messages (bot_type, chat_id, sender_name, message_text, direction) VALUES ($1, $2, $3, $4, $5)', [botType, chatId, 'Admin', `MEDIA|${type}|${req.file.filename}`, 'out']);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static('public'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server kører på port ${PORT}`)); 
