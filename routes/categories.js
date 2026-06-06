const express = require('express');
const db = require('../database');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// === ОТРИМАННЯ ВСІХ КАТЕГОРІЙ ===
router.get('/', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    // Ми вибираємо системні категорії (де user_id порожній) 
    // АБО категорії, які створив саме цей користувач
    const sql = `SELECT * FROM Categories WHERE user_id IS NULL OR user_id = ?`;
    
    db.all(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Помилка отримання категорій' });
        
        res.json(rows); // Відправляємо масив категорій на фронтенд
    });
});

// === СТВОРЕННЯ НОВОЇ КАТЕГОРІЇ ===
router.post('/', authenticateToken, (req, res) => {
    const { type, name, icon, color } = req.body;
    const userId = req.user.userId;

    if (!type || !name) {
        return res.status(400).json({ error: 'Тип та назва категорії обов\'язкові' });
    }

    const sql = `INSERT INTO Categories (user_id, type, name, icon, color) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [userId, type, name, icon || '📌', color || '#cccccc'], function(err) {
        if (err) return res.status(500).json({ error: 'Помилка збереження категорії' });
        
        res.status(201).json({ message: 'Категорію створено', categoryId: this.lastID });
    });
});

// === ОНОВЛЕННЯ КАТЕГОРІЇ ===
router.put('/:id', authenticateToken, (req, res) => {
    const { type, name, icon, color } = req.body;
    const categoryId = req.params.id;
    const userId = req.user.userId;

    const sql = `UPDATE Categories SET type = ?, name = ?, icon = ?, color = ? WHERE id = ? AND user_id = ?`;
    db.run(sql, [type, name, icon, color, categoryId, userId], function(err) {
        if (err) return res.status(500).json({ error: 'Помилка оновлення категорії' });
        res.json({ message: 'Категорію оновлено' });
    });
});

// === ВИДАЛЕННЯ КАТЕГОРІЇ ===
router.delete('/:id', authenticateToken, (req, res) => {
    const categoryId = req.params.id;
    const userId = req.user.userId;

    const sql = `DELETE FROM Categories WHERE id = ? AND user_id = ?`;
    db.run(sql, [categoryId, userId], function(err) {
        if (err) return res.status(500).json({ error: 'Помилка видалення категорії' });
        res.json({ message: 'Категорію видалено' });
    });
});

module.exports = router;