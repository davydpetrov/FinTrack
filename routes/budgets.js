const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// === 1. СТВОРЕННЯ АБО ОНОВЛЕННЯ БЮДЖЕТУ ===
router.post('/', authenticateToken, (req, res) => {
    const { category_id, amount_limit } = req.body;
    const userId = req.user.userId;

    if (!category_id || !amount_limit) {
        return res.status(400).json({ error: 'Оберіть категорію та вкажіть ліміт' });
    }

    // Перевіряємо, чи є вже бюджет для цієї категорії. Якщо є - оновлюємо, якщо ні - створюємо.
    const checkSql = `SELECT id FROM Budgets WHERE user_id = ? AND category_id = ?`;
    
    db.get(checkSql, [userId, category_id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Помилка бази даних' });

        if (row) {
            // Оновлюємо існуючий
            db.run(`UPDATE Budgets SET amount_limit = ? WHERE id = ?`, [amount_limit, row.id], (err) => {
                if (err) return res.status(500).json({ error: 'Помилка оновлення бюджету' });
                res.json({ message: 'Бюджет оновлено' });
            });
        } else {
            // Створюємо новий (period за замовчуванням 'monthly')
            db.run(`INSERT INTO Budgets (user_id, category_id, amount_limit, period) VALUES (?, ?, ?, 'monthly')`, 
                [userId, category_id, amount_limit], (err) => {
                if (err) return res.status(500).json({ error: 'Помилка створення бюджету' });
                res.status(201).json({ message: 'Бюджет створено' });
            });
        }
    });
});

// === 2. ОТРИМАННЯ БЮДЖЕТІВ І ПРОГРЕСУ ===
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    // Складний SQL-запит: беремо бюджети, приєднуємо категорії, і рахуємо суму витрат 
    // для цієї категорії ТІЛЬКИ ЗА ПОТОЧНИЙ МІСЯЦЬ
    const sql = `
        SELECT 
            b.id as budget_id, 
            b.amount_limit, 
            c.name as categoryName, 
            c.icon,
            COALESCE(SUM(t.amount), 0) as spent
        FROM Budgets b
        JOIN Categories c ON b.category_id = c.id
        LEFT JOIN Transactions t ON t.category_id = b.category_id 
             AND t.user_id = b.user_id 
             AND t.type = 'expense'
             AND strftime('%Y-%m', t.date) = strftime('%Y-%m', 'now')
        WHERE b.user_id = ?
        GROUP BY b.id
    `;

    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Помилка отримання бюджетів' });
        res.json(rows);
    });
});

module.exports = router;