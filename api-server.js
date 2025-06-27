const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory key store: { userId: { key, expiresAt } }
const keys = {};

function generateRandomKey(length = 32) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

// Generate a new key for a userId (valid for 8 hours)
app.post('/generate-key', (req, res) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId' });

    const key = generateRandomKey();
    const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
    keys[userId] = { key, expiresAt };

    res.json({ success: true, key, expiresAt });
});

// Validate a key for a userId
app.post('/validate-key', (req, res) => {
    const { userId, key } = req.body;
    if (!userId || !key) return res.status(400).json({ valid: false });

    const record = keys[userId];
    if (record && record.key === key && Date.now() < record.expiresAt) {
        res.json({ valid: true });
    } else {
        res.json({ valid: false });
    }
});

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)); 