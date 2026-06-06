const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database'); // Підключаємося до БД (дві крапки означають вихід на рівень вище)
const authenticateToken = require('../middleware/authMiddleware'); // ДОДАНО

const router = express.Router();

// Секретний ключ для створення токенів (у реальних проєктах його ховають у спец. файлах, але для курсової залишимо так)
const SECRET_KEY = 'my_super_secret_key_fintrack';

// === 1. МАРШРУТ РЕЄСТРАЦІЇ ===
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    // Перевіряємо, чи передали нам email та пароль
    if (!email || !password) {
        return res.status(400).json({ error: 'Будь ласка, введіть email та пароль' });
    }

    try {
        // Хешуємо пароль (робимо його нечитабельним)
        const hashedPassword = await bcrypt.hash(password, 10);

        // Зберігаємо користувача в БД
        const sql = `INSERT INTO Users (email, password_hash) VALUES (?, ?)`;
        db.run(sql, [email, hashedPassword], function(err) {
            if (err) {
                // Якщо такий email вже є в базі
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Користувач з таким email вже існує' });
                }
                return res.status(500).json({ error: 'Помилка бази даних під час реєстрації' });
            }
            
            res.status(201).json({ message: 'Реєстрація успішна!', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
});

// === 2. МАРШРУТ АВТОРИЗАЦІЇ (ЛОГІН) ===
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Будь ласка, введіть email та пароль' });
    }

    // Шукаємо користувача в БД за email
    const sql = `SELECT * FROM Users WHERE email = ?`;
    db.get(sql, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Помилка бази даних' });
        
        // Якщо користувача не знайдено
        if (!user) return res.status(401).json({ error: 'Невірний email або пароль' });

        // Порівнюємо введений пароль з хешем із бази даних
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) return res.status(401).json({ error: 'Невірний email або пароль' });

        // Якщо все супер - створюємо токен (перепустку), дійсну 24 години
        const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '24h' });

        res.json({ message: 'Вхід успішний', token: token });
    });
});

// === 3. ОТРИМАННЯ ДАНИХ ПРОФІЛЮ ===
router.get('/profile', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const sql = `SELECT email, base_currency FROM Users WHERE id = ?`;
    
    db.get(sql, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'Помилка БД' });
        if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });
        
        res.json(user);
    });
});

// === 4. ОНОВЛЕННЯ ПРОФІЛЮ (Валюта та Пароль) ===
router.put('/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const { base_currency, new_password } = req.body;

    try {
        // Якщо користувач передав новий пароль
        if (new_password && new_password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(new_password, 10);
            const sql = `UPDATE Users SET base_currency = ?, password_hash = ? WHERE id = ?`;
            
            db.run(sql, [base_currency || 'UAH', hashedPassword, userId], function(err) {
                if (err) return res.status(500).json({ error: 'Помилка оновлення' });
                res.json({ message: 'Профіль та пароль успішно оновлено!' });
            });
        } else {
            // Якщо пароль не міняємо, оновлюємо тільки валюту
            const sql = `UPDATE Users SET base_currency = ? WHERE id = ?`;
            db.run(sql, [base_currency || 'UAH', userId], function(err) {
                if (err) return res.status(500).json({ error: 'Помилка оновлення валюти' });
                res.json({ message: 'Налаштування валюти оновлено!' });
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

// === 5. ІМІТАЦІЯ ВІДНОВЛЕННЯ ПАРОЛЯ ЧЕРЕЗ ПОШТУ ===
router.post('/reset-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Введіть email' });
    
    // В реальному проєкті тут працює nodemailer, який шле лист. 
    // Для ККП достатньо імітації (згідно з MVP):
    res.json({ message: `Інструкції з відновлення надіслано на ${email} (Імітація)` });
});

module.exports = router;