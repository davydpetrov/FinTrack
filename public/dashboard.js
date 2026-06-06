document.addEventListener('DOMContentLoaded', () => {
    let expenseChartInstance = null;
    let dynamicsChartInstance = null; // Для стовпчикового графіка
    let currentTransactions = [];
    const filterMonthInput = document.getElementById('filter-month');
    const currencySymbol = localStorage.getItem('currency') || '₴';
    
    // Встановлюємо поточний місяць (формат YYYY-MM)
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    filterMonthInput.value = currentMonthStr;

    // Коли користувач змінює місяць - оновлюємо всі дані
    filterMonthInput.addEventListener('change', () => {
        loadAnalytics();
        loadTransactions();
        loadChart();
        loadDynamicsChart();
    });
    // 1. ПЕРЕВІРКА АВТОРИЗАЦІЇ
    const token = localStorage.getItem('token');
    
    // Якщо токена немає, викидаємо користувача на сторінку входу
    if (!token) {
        window.location.href = '/index.html';
        return; // Зупиняємо виконання скрипта
    }

    // 2. ФУНКЦІЯ: ВИХІД ІЗ СИСТЕМИ
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.removeItem('token'); // Видаляємо токен
        window.location.href = '/index.html'; // Переходимо на сторінку входу
    });

    // 3. ФУНКЦІЯ: ЗАВАНТАЖЕННЯ АНАЛІТИКИ (Баланс)
    async function loadAnalytics() {
        try {
            const monthParam = filterMonthInput.value ? `?month=${filterMonthInput.value}` : '';
            const response = await fetch(`/api/analytics/summary${monthParam}`, {
                method: 'GET',
                // ОСНОВНЕ: Додаємо токен до кожного запиту!
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                // Якщо токен прострочився
                localStorage.removeItem('token');
                window.location.href = '/index.html';
                return;
            }

            const data = await response.json();
            
            // Оновлюємо цифри на екрані
            document.getElementById('total-balance').textContent = `${data.balance.toFixed(2)} ${currencySymbol}`;
            document.getElementById('total-income').textContent = `+ ${data.income.toFixed(2)} ${currencySymbol}`;
            document.getElementById('total-expense').textContent = `- ${data.expense.toFixed(2)} ${currencySymbol}`;
            
            // Якщо баланс від'ємний, робимо його червоним
            if (data.balance < 0) {
                document.getElementById('total-balance').style.color = '#dc3545';
            } else {
                document.getElementById('total-balance').style.color = '#333';
            }

        } catch (error) {
            console.error('Помилка завантаження аналітики:', error);
        }
    }

    // 4. ФУНКЦІЯ: ЗАВАНТАЖЕННЯ СПИСКУ ТРАНЗАКЦІЙ
    async function loadTransactions() {
        try {
            const monthParam = filterMonthInput.value ? `?month=${filterMonthInput.value}` : '';
            const response = await fetch(`/api/transactions${monthParam}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const transactions = await response.json();
            currentTransactions = transactions;
            const tbody = document.getElementById('transactions-tbody');
            tbody.innerHTML = ''; // Очищаємо таблицю перед оновленням

            transactions.forEach(t => {
                const tr = document.createElement('tr');
                
                // Форматуємо вигляд типу
                const typeText = t.type === 'income' ? '🟢 Дохід' : '🔴 Витрата';
                
                tr.innerHTML = `
                    <td>${t.date}</td>
                    <td>${typeText}</td>
                    <td>${t.amount.toFixed(2)} ${currencySymbol}</td>
                    <td>${t.description || '-'}</td>
                    <td>
                        <button class="edit-btn" onclick="editTransaction(${t.id})">✏️</button>
                        <button class="delete-btn" onclick="deleteTransaction(${t.id})">❌</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Помилка завантаження транзакцій:', error);
        }
    }

    // 5. ФУНКЦІЯ: ДОДАВАННЯ НОВОЇ ТРАНЗАКЦІЇ
    document.getElementById('transaction-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const newTransaction = {
            type: document.getElementById('type').value,
            amount: parseFloat(document.getElementById('amount').value),
            category_id: parseInt(document.getElementById('category_id').value),
            date: document.getElementById('date').value,
            description: document.getElementById('description').value
        };

        try {
            const form = document.getElementById('transaction-form');
            const editingId = form.dataset.editingId; // Перевіряємо, чи ми щось редагуємо
            
            // Якщо є editingId - робимо PUT (оновлення), інакше POST (створення)
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/transactions/${editingId}` : '/api/transactions';

            const response = await fetch(url, {
                method: method,
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newTransaction)
            });

            if (response.ok) {
                form.reset();
                // Повертаємо форму до нормального стану створення
                form.removeAttribute('data-editing-id');
                const submitBtn = form.querySelector('button[type="submit"]');
                submitBtn.textContent = 'Зберегти транзакцію';
                submitBtn.style.backgroundColor = '#007bff';
                submitBtn.style.color = 'white';

                loadAnalytics();
                loadTransactions();
                loadChart();
                loadDynamicsChart();
                loadBudgets();
            } else {
                alert('Помилка збереження. Перевірте дані.');
            }
        } catch (error) { console.error('Помилка:', error); }
    });

    // 6. ФУНКЦІЯ: ЗАВАНТАЖЕННЯ КАТЕГОРІЙ ДЛЯ ВИПАДАЮЧОГО СПИСКУ
    async function loadCategories() {
        try {
            const response = await fetch('/api/categories', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const categories = await response.json();
            const categorySelect = document.getElementById('category_id');
            const budgetSelect = document.getElementById('budget-category');

            // Очищаємо список, залишаючи тільки перший пункт (підказку)
            categorySelect.innerHTML = '<option value="" disabled selected>Оберіть категорію...</option>';

            budgetSelect.innerHTML = '<option value="" disabled selected>Категорія...</option>';

            categories.forEach(cat => {
                const optionHtml = `<option value="${cat.id}">${cat.icon || ''} ${cat.name}</option>`;
                categorySelect.innerHTML += optionHtml;
                
                // Додаємо в бюджети ТІЛЬКИ категорії витрат
                if (cat.type === 'expense') {
                    budgetSelect.innerHTML += optionHtml; 
                }
            });
        } catch (error) {
            console.error('Помилка завантаження категорій:', error);
        }
    }

    // 7. ФУНКЦІЯ: МАЛЮВАННЯ ГРАФІКА
    async function loadChart() {
        try {
            const monthParam = filterMonthInput.value ? `?month=${filterMonthInput.value}` : '';
            const response = await fetch(`/api/analytics/chart${monthParam}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            // Розділяємо дані на два масиви: назви (labels) і суми (amounts)
            const labels = data.map(item => item.categoryName);
            const amounts = data.map(item => item.total);
            const colors = data.map(item => item.color || '#999999');

            const ctx = document.getElementById('expenseChart').getContext('2d');

            // ВАЖЛИВО: Якщо графік вже був намальований, його треба видалити перед оновленням
            if (expenseChartInstance) {
                expenseChartInstance.destroy();
            }

            // Створюємо новий графік
            expenseChartInstance = new Chart(ctx, {
                type: 'doughnut', // Тип: кільцева діаграма
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Витрати (₴)',
                        data: amounts,
                        // Кольори для різних шматків графіка
                        backgroundColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        } catch (error) {
            console.error('Помилка завантаження графіка:', error);
        }
    }

    // 8. ФУНКЦІЯ: ДОДАВАННЯ КОРИСТУВАЦЬКОЇ КАТЕГОРІЇ
    document.getElementById('category-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const newCategory = {
            type: document.getElementById('cat-type').value,
            name: document.getElementById('cat-name').value,
            icon: document.getElementById('cat-icon').value,
            color: document.getElementById('cat-color').value
        };

        try {
            const response = await fetch('/api/categories', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(newCategory)
            });

            if (response.ok) {
                document.getElementById('category-form').reset();
                alert('Категорію успішно створено!');
                loadCategories(); // Одразу оновлюємо випадаючий список транзакцій!
                loadBudgets();
            }
        } catch (error) {
            console.error('Помилка додавання категорії:', error);
        }
    });

    // 9. ФУНКЦІЯ: ЗАВАНТАЖЕННЯ БЮДЖЕТІВ ТА МАЛЮВАННЯ PROGRESS-БАРІВ
    async function loadBudgets() {
        try {
            const response = await fetch('/api/budgets', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const budgets = await response.json();
            const container = document.getElementById('budgets-container');
            
            if (budgets.length === 0) {
                container.innerHTML = '<p style="color: #999; font-size: 14px;">Ліміти ще не встановлені.</p>';
                return;
            }

            container.innerHTML = ''; // Очищаємо

            budgets.forEach(b => {
                // Рахуємо відсоток витрат
                let percent = (b.spent / b.amount_limit) * 100;
                if (percent > 100) percent = 100; // Щоб смужка не вилізла за межі

                // Визначаємо колір залежно від використання ліміту
                let colorClass = '#28a745'; // Зелений (до 75%)
                if (percent >= 75 && percent < 95) colorClass = '#ffc107'; // Жовтий
                if (percent >= 95) colorClass = '#dc3545'; // Червоний

                const div = document.createElement('div');
                div.className = 'budget-item';
                div.innerHTML = `
                    <div class="budget-header">
                        <span>${b.icon || ''} <b>${b.categoryName}</b></span>
                        <span>${b.spent.toFixed(2)} / ${b.amount_limit.toFixed(2)} ${currencySymbol}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percent}%; background-color: ${colorClass};"></div>
                    </div>
                `;
                container.appendChild(div);

                // Якщо перевищено ліміт, виводимо системний алерт (вимога СРС)
                if (b.spent > b.amount_limit) {
                    // Щоб не спамити алертами, можна просто виділити текст червоним або додати значок
                    div.querySelector('.budget-header').style.color = '#dc3545';
                    div.querySelector('.budget-header').innerHTML += ' <span style="font-size:12px;">⚠️ Перевищено!</span>';
                }
            });
        } catch (error) { console.error('Помилка завантаження бюджетів:', error); }
    }

    // 10. ФУНКЦІЯ: ЗБЕРЕЖЕННЯ ЛІМІТУ БЮДЖЕТУ
    document.getElementById('budget-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const categoryId = document.getElementById('budget-category').value;
        const limit = document.getElementById('budget-limit').value;

        try {
            const response = await fetch('/api/budgets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ category_id: categoryId, amount_limit: limit })
            });

            if (response.ok) {
                document.getElementById('budget-form').reset();
                loadBudgets(); // Оновлюємо смужки
            }
        } catch (error) { console.error(error); }
    });

    // 11. ФУНКЦІЯ: МАЛЮВАННЯ ГРАФІКА ДИНАМІКИ (Bar Chart)
    async function loadDynamicsChart() {
        try {
            const monthParam = filterMonthInput.value ? `?month=${filterMonthInput.value}` : '';
            const response = await fetch(`/api/analytics/dynamics${monthParam}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            // Підготовка даних
            const labels = data.map(item => item.date); // Дні (вісь X)
            const incomes = data.map(item => item.dailyIncome); // Зелені стовпчики
            const expenses = data.map(item => item.dailyExpense); // Червоні стовпчики

            const ctx = document.getElementById('dynamicsChart').getContext('2d');

            // Видаляємо старий графік, якщо він був
            if (dynamicsChartInstance) {
                dynamicsChartInstance.destroy();
            }

            // Малюємо новий
            dynamicsChartInstance = new Chart(ctx, {
                type: 'bar', // Тип: стовпчикова діаграма
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Доходи (₴)',
                            data: incomes,
                            backgroundColor: '#28a745', // Зелений
                        },
                        {
                            label: 'Витрати (₴)',
                            data: expenses,
                            backgroundColor: '#dc3545', // Червоний
                        }
                    ]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { beginAtZero: true } // Щоб вісь Y починалася з нуля
                    }
                }
            });
        } catch (error) {
            console.error('Помилка завантаження динаміки:', error);
        }
    }

    // РОБИМО ФУНКЦІЮ ВИДАЛЕННЯ ГЛОБАЛЬНОЮ, щоб вона працювала з HTML onClick
    window.deleteTransaction = async function(id) {
        if (!confirm('Ви впевнені, що хочете видалити цей запис?')) return;

        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                loadAnalytics();
                loadTransactions();
                loadBudgets();
                loadDynamicsChart();
            } else {
                alert('Помилка видалення');
            }
        } catch (error) {
            console.error('Помилка видалення:', error);
        }
    };

    // ФУНКЦІЯ: ПІДГОТОВКА ДО РЕДАГУВАННЯ ТРАНЗАКЦІЇ
    window.editTransaction = function(id) {
        // Знаходимо транзакцію в нашому масиві
        const t = currentTransactions.find(x => x.id === id);
        if (!t) return;

        // Заповнюємо форму її даними
        document.getElementById('type').value = t.type;
        document.getElementById('amount').value = t.amount;
        document.getElementById('category_id').value = t.category_id;
        document.getElementById('date').value = t.date;
        document.getElementById('description').value = t.description;

        // Міняємо стан форми (щоб вона знала, що ми РЕДАГУЄМО, а не створюємо)
        const form = document.getElementById('transaction-form');
        form.dataset.editingId = id; // Зберігаємо ID в атрибут data-editing-id
        form.querySelector('button[type="submit"]').textContent = 'Оновити транзакцію';
        form.querySelector('button[type="submit"]').style.backgroundColor = '#ffc107'; // Робимо кнопку жовтою
        form.querySelector('button[type="submit"]').style.color = '#000';
    };

    // При першому завантаженні сторінки викликаємо функції завантаження даних
    loadAnalytics();
    loadTransactions();
    loadCategories();
    loadChart();
    loadDynamicsChart();
    loadBudgets();
});