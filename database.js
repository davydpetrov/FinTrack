const sqlite3 = require('sqlite3').verbose();

// Створюємо або підключаємось до файлу бази даних 'database.sqlite'
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error('Помилка підключення до БД:', err.message);
    } else {
        console.log('Успішне підключення до бази даних SQLite.');
        db.run("PRAGMA foreign_keys = ON"); 
        initDB(); 
    }
});

// Функція для створення таблиць
function initDB() {
    // db.serialize гарантує, що запити будуть виконуватися послідовно
    db.serialize(() => {
        // 1. Таблиця Користувачів
        db.run(`CREATE TABLE IF NOT EXISTS Users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            base_currency TEXT DEFAULT 'UAH',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2. Таблиця Категорій
        db.run(`CREATE TABLE IF NOT EXISTS Categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT CHECK( type IN ('income', 'expense') ) NOT NULL,
            name TEXT NOT NULL,
            icon TEXT,
            color TEXT,
            FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE
        )`);

        // --- ДОДАНО: Створюємо базові категорії, якщо таблиця порожня ---
        db.get("SELECT COUNT(*) as count FROM Categories", (err, row) => {
            if (row && row.count === 0) {
                // ID 1 - Зарплата (Дохід)
                db.run("INSERT INTO Categories (type, name, icon) VALUES ('income', 'Зарплата', '💰')");
                // ID 2 - Продукти (Витрата)
                db.run("INSERT INTO Categories (type, name, icon) VALUES ('expense', 'Продукти', '🛒')");
                console.log('Створено базові системні категорії.');
            }
        });
        // ---------------------------------------------------------------

        // 3. Таблиця Транзакцій
        db.run(`CREATE TABLE IF NOT EXISTS Transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category_id INTEGER,
            type TEXT CHECK( type IN ('income', 'expense') ) NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,
            FOREIGN KEY(category_id) REFERENCES Categories(id) ON DELETE SET NULL
        )`);

        // 4. Таблиця Бюджетів
        db.run(`CREATE TABLE IF NOT EXISTS Budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category_id INTEGER NOT NULL,
            amount_limit REAL NOT NULL,
            period TEXT CHECK( period IN ('weekly', 'monthly', 'yearly') ) NOT NULL,
            start_date TEXT,
            end_date TEXT,
            FOREIGN KEY(user_id) REFERENCES Users(id) ON DELETE CASCADE,
            FOREIGN KEY(category_id) REFERENCES Categories(id) ON DELETE CASCADE
        )`);
    });
    
    console.log('Таблиці успішно ініціалізовано (або вони вже існують).');
}

module.exports = db;