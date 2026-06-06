document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/index.html';
        return;
    }

    // Завантаження списку користувачів
    async function loadUsers() {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                alert('Доступ заборонено!');
                window.location.href = '/dashboard.html';
                return;
            }

            const users = await response.json();
            const tbody = document.getElementById('users-tbody');
            tbody.innerHTML = '';

            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.email}</td>
                    <td>${new Date(user.created_at).toLocaleString('uk-UA')}</td>
                    <td>${user.transaction_count} транзакцій</td>
                    <td>
                        <button class="block-btn" onclick="blockUser(${user.id}, '${user.email}')">Заблокувати</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Помилка завантаження користувачів:', error);
        }
    }

    // Глобальна функція для блокування
    window.blockUser = async function(userId, email) {
        if (!confirm(`Ви впевнені, що хочете ЗАБЛОКУВАТИ (видалити) користувача ${email}? Цю дію неможливо скасувати!`)) return;

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert('Користувача заблоковано!');
                loadUsers(); // Оновлюємо таблицю
            } else {
                alert('Помилка при блокуванні.');
            }
        } catch (error) {
            console.error('Помилка:', error);
        }
    };

    // Запускаємо при старті
    loadUsers();
});