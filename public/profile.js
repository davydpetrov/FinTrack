document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    const emailSpan = document.getElementById('user-email');
    const currencySelect = document.getElementById('currency');
    const messageDiv = document.getElementById('message');

    // Завантаження даних профілю
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok) {
            emailSpan.textContent = data.email;
            // Встановлюємо обрану валюту або дефолтну ₴
            currencySelect.value = data.base_currency || '₴'; 
            
            // Зберігаємо локально, щоб дашборд знав, який значок малювати
            localStorage.setItem('currency', data.base_currency || '₴');
        } else {
            alert('Помилка завантаження профілю');
        }
    } catch (error) { console.error(error); }

    // Збереження змін
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newCurrency = currencySelect.value;
        const newPassword = document.getElementById('new-password').value;

        try {
            const response = await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ base_currency: newCurrency, new_password: newPassword })
            });

            const data = await response.json();
            
            if (response.ok) {
                messageDiv.style.color = 'green';
                messageDiv.textContent = data.message;
                localStorage.setItem('currency', newCurrency); // Оновлюємо валюту в браузері
                document.getElementById('new-password').value = ''; // Очищаємо поле пароля
            } else {
                messageDiv.style.color = 'red';
                messageDiv.textContent = data.error;
            }
        } catch (error) { console.error(error); }
    });
});