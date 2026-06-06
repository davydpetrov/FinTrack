const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// === ОТРИМАННЯ БАЛАНСУ ТА СТАТИСТИКИ (З ФІЛЬТРАЦІЄЮ) ===
router.get('/summary', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const month = req.query.month;

    let sql = `
        SELECT 
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense
        FROM Transactions 
        WHERE user_id = ?
    `;
    let params = [userId];

    if (month) {
        sql += ` AND strftime('%Y-%m', date) = ?`;
        params.push(month);
    }

    db.get(sql, params, (err, row) => {
        if (err) return res.status(500).json({ error: 'Помилка обчислення статистики' });

        const income = row.totalIncome || 0;
        const expense = row.totalExpense || 0;
        const balance = income - expense;

        res.json({ balance, income, expense });
    });
});

// === ОТРИМАННЯ ДАНИХ ДЛЯ ГРАФІКА (З ФІЛЬТРАЦІЄЮ) ===
router.get('/chart', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const month = req.query.month;

    let sql = `
        SELECT 
            c.name as categoryName, 
            c.color as color,
            SUM(t.amount) as total 
        FROM Transactions t
        JOIN Categories c ON t.category_id = c.id
        WHERE t.user_id = ? AND t.type = 'expense'
    `;
    let params = [userId];

    if (month) {
        sql += ` AND strftime('%Y-%m', t.date) = ?`;
        params.push(month);
    }

    sql += ` GROUP BY c.id`;

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Помилка отримання даних для графіка' });
        res.json(rows);
    });
});

// === ОТРИМАННЯ ДИНАМІКИ ПО ДНЯХ (ДЛЯ СТОВПЧИКОВОГО ГРАФІКА) ===
router.get('/dynamics', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const month = req.query.month;

    // Групуємо суми доходів і витрат за кожною датою
    let sql = `
        SELECT 
            date,
            SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as dailyIncome,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as dailyExpense
        FROM Transactions
        WHERE user_id = ?
    `;
    let params = [userId];

    if (month) {
        sql += ` AND strftime('%Y-%m', date) = ?`;
        params.push(month);
    }

    sql += ` GROUP BY date ORDER BY date ASC`; // Сортуємо від першого до останнього дня

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: 'Помилка отримання динаміки' });
        res.json(rows);
    });
});

module.exports = router;