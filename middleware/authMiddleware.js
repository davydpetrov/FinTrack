const jwt = require('jsonwebtoken');

const SECRET_KEY = 'my_super_secret_key_fintrack'; // Має збігатися з ключем у файлі auth.js

module.exports = (req, res, next) => {
    // Шукаємо токен у заголовках запиту (формат: "Bearer <token>")
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Доступ заборонено: відсутній токен' });
    }

    // Відрізаємо слово "Bearer " і залишаємо лише сам токен
    const token = authHeader.split(' ')[1];

    try {
        // Перевіряємо токен. Якщо він дійсний, витягуємо з нього userId
        const decoded = jwt.verify(token, SECRET_KEY);
        // Додаємо userId до об'єкта запиту, щоб інші функції знали, ХТО робить запит
        req.user = decoded; 
        next(); // Пропускаємо запит далі
    } catch (error) {
        res.status(401).json({ error: 'Недійсний або прострочений токен' });
    }
};