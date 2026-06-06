const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware'); // Підключаємо наш бар'єр

const router = express.Router();

// === 1. ДОДАВАННЯ НОВОЇ ТРАНЗАКЦІЇ ===
// Зверніть увагу: ми вставили authenticateToken перед функцією-обробником
router.post('/', authenticateToken, (req, res) => {
    const { category_id, type, amount, date, description } = req.body;
    const userId = req.user.userId; // Беремо ID користувача з токена

    // Базова перевірка даних
    if (!type || !amount || !date) {
        return res.status(400).json({ error: 'Заповніть усі обов’язкові поля: тип, суму та дату' });
    }

    const sql = `INSERT INTO Transactions (user_id, category_id, type, amount, date, description) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
                 
    db.run(sql, [userId, category_id, type, amount, date, description], function(err) {
        if (err) return res.status(500).json({ error: 'Помилка збереження транзакції' });
        
        res.status(201).json({ message: 'Транзакція додана', transactionId: this.lastID });
    });
});

// === 2. ОТРИМАННЯ ТРАНЗАКЦІЙ (З ФІЛЬТРАЦІЄЮ) ===
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const month = req.query.month; // Отримуємо параметр місяця з URL (напр. 2026-06)

    let sql = `SELECT * FROM Transactions WHERE user_id = ?`;
    let params = [userId];

    // Якщо з фронтенду передали місяць, додаємо фільтр до SQL-запиту
    if (month) {
        sql += ` AND strftime('%Y-%m', date) = ?`;
        params.push(month);
    }
    
    sql += ` ORDER BY date DESC`; // Сортуємо найновіші зверху
    
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Помилка отримання транзакцій' });
        res.json(rows);
    });
});

// === 3. ВИДАЛЕННЯ ТРАНЗАКЦІЇ ===
router.delete('/:id', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const transactionId = req.params.id;

    // Видаляємо тільки ту транзакцію, яка належить саме цьому користувачу
    const sql = `DELETE FROM Transactions WHERE id = ? AND user_id = ?`;
    
    db.run(sql, [transactionId, userId], function(err) {
        if (err) return res.status(500).json({ error: 'Помилка видалення' });
        if (this.changes === 0) return res.status(404).json({ error: 'Транзакцію не знайдено або у вас немає прав' });
        
        res.json({ message: 'Транзакція успішно видалена' });
    });
});

// === 4. ОНОВЛЕННЯ (РЕДАГУВАННЯ) ТРАНЗАКЦІЇ ===
router.put('/:id', authenticateToken, (req, res) => {
    const { category_id, type, amount, date, description } = req.body;
    const transactionId = req.params.id;
    const userId = req.user.userId;

    const sql = `UPDATE Transactions 
                 SET category_id = ?, type = ?, amount = ?, date = ?, description = ? 
                 WHERE id = ? AND user_id = ?`;
                 
    db.run(sql, [category_id, type, amount, date, description, transactionId, userId], function(err) {
        if (err) return res.status(500).json({ error: 'Помилка оновлення транзакції' });
        if (this.changes === 0) return res.status(404).json({ error: 'Транзакцію не знайдено' });
        
        res.json({ message: 'Транзакцію успішно оновлено' });
    });
});

module.exports = router;