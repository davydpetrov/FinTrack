const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const analyticsRoutes = require('./routes/analytics');
const categoryRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budgets');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = 3000;

// Налаштування (Middlewares)
app.use(cors()); // Дозволяємо крос-доменні запити
app.use(express.json()); // Вчимо сервер розуміти JSON

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/admin', adminRoutes);

// Найпростіший тестовий маршрут (Endpoint)
app.get('/api/test', (req, res) => {
    res.json({ message: 'Привіт! Сервер FinTrack успішно працює!' });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});