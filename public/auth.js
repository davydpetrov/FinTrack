document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const toggleBtn = document.getElementById('toggle-mode');
    const messageDiv = document.getElementById('message');

    // Стан: true - ми логінимося, false - ми реєструємося
    let isLoginMode = true; 

    // Якщо користувач вже має токен (вже увійшов), одразу кидаємо його на головну
    if (localStorage.getItem('token')) {
        window.location.href = '/dashboard.html';
    }

    // Перемикання між Входом та Реєстрацією
    toggleBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            formTitle.textContent = 'Вхід у систему';
            submitBtn.textContent = 'Увійти';
            toggleBtn.textContent = 'Немає акаунту? Зареєструватися';
        } else {
            formTitle.textContent = 'Реєстрація';
            submitBtn.textContent = 'Зареєструватися';
            toggleBtn.textContent = 'Вже є акаунт? Увійти';
        }
        messageDiv.textContent = ''; // Очищаємо помилки
    });

    // Відправка форми на сервер
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Зупиняємо стандартне перезавантаження сторінки
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Визначаємо, на який URL слати запит
        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            });

            const data = await response.json();

            if (response.ok) {
                if (isLoginMode) {
                    // Якщо вхід успішний, зберігаємо токен у браузері і переходимо в дашборд
                    localStorage.setItem('token', data.token);
                    window.location.href = '/dashboard.html';
                } else {
                    // Якщо реєстрація успішна, просимо увійти
                    messageDiv.style.color = 'green';
                    messageDiv.textContent = 'Реєстрація успішна! Тепер увійдіть.';
                    isLoginMode = true;
                    toggleBtn.click(); // Перемикаємо на форму логіну автоматично
                }
            } else {
                // Якщо сервер повернув помилку (напр. "Невірний пароль")
                messageDiv.style.color = 'red';
                messageDiv.textContent = data.error;
            }
        } catch (error) {
            messageDiv.style.color = 'red';
            messageDiv.textContent = 'Помилка з\'єднання з сервером';
        }
    });

    document.getElementById('forgot-btn').addEventListener('click', async () => {
        const email = prompt('Введіть ваш email для відновлення пароля:');
        if (email) {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            alert(data.message || data.error);
        }
    });
});