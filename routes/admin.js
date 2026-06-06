const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// === 1. ОТРИМАННЯ СПИСКУ КОРИСТУВАЧІВ (ДЛЯ АДМІНА) ===
router.get('/users', authenticateToken, (req, res) => {
    // SQL-запит: дістаємо користувачів і одразу рахуємо, скільки у кожного транзакцій
    const sql = `
        SELECT 
            u.id, 
            u.email, 
            u.created_at,
            COUNT(t.id) as transaction_count
        FROM Users u
        LEFT JOIN Transactions t ON u.id = t.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `;
    
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Помилка бази даних' });
        res.json(rows);
    });
});

// === 2. БЛОКУВАННЯ (ВИДАЛЕННЯ) КОРИСТУВАЧА ===
router.delete('/users/:id', authenticateToken, (req, res) => {
    const userIdToBlock = req.params.id;

    // Згідно з налаштуваннями БД (ON DELETE CASCADE), якщо ми видалимо користувача,
    // усі його транзакції, бюджети та категорії також видаляться автоматично.
    const sql = `DELETE FROM Users WHERE id = ?`;
    
    db.run(sql, [userIdToBlock], function(err) {
        if (err) return res.status(500).json({ error: 'Помилка видалення користувача' });
        if (this.changes === 0) return res.status(404).json({ error: 'Користувача не знайдено' });
        
        res.json({ message: 'Користувача успішно заблоковано (видалено)' });
    });
});

module.exports = router;