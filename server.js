const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Fortæl serveren at alle filer ligger i mappen "public"
app.use(express.static('public'));

// Rute til forsiden
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server kører på port ${PORT}`);
});
