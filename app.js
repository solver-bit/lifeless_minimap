// Определяем устройство
const isMobile = window.innerWidth < 768;
document.body.classList.add(isMobile ? 'mobile' : 'pc');

// Фоллбек для tg
let tg = window.Telegram?.WebApp;
if (!tg) {
    tg = {
        initDataUnsafe: { user: { id: 123456789, first_name: "Тест" } },
        expand: () => {},
        close: () => {},
        showPopup: (obj) => alert(obj.message),
        openTelegramLink: (url) => window.open(url, '_blank'),
        sendData: () => {}
    };
}

// Инициализация
tg.expand();
let user = tg.initDataUnsafe?.user || { id: 0, first_name: "Гость" };
document.getElementById('user-id').textContent = user.id;

// API конфигурация
const API_BASE = "https://ваш-домен.ru"; // замени после покупки сервера
const SECRET = "my_super_secret_key";

// Создание навигации
function createNav() {
    const tabs = ['home', 'cases', 'profile', 'bonuses', 'withdraw', 'shop'];
    let navHTML = '';
    if (isMobile) {
        navHTML = '<nav class="bottom-nav">';
        tabs.forEach(tab => {
            navHTML += `<button class="nav-btn ${tab === 'home' ? 'active' : ''}" data-tab="${tab}"><span class="nav-icon">${getIcon(tab)}</span><span class="nav-label">${getLabel(tab)}</span></button>`;
        });
        navHTML += '</nav>';
    } else {
        navHTML = '<aside class="sidebar"><nav class="side-nav">';
        tabs.forEach(tab => {
            navHTML += `<button class="side-btn ${tab === 'home' ? 'active' : ''}" data-tab="${tab}">${getIcon(tab)} ${getLabel(tab)}</button>`;
        });
        navHTML += '</nav></aside>';
    }
    // Вставляем навигацию в подходящее место
    if (isMobile) {
        document.getElementById('app').insertAdjacentHTML('beforeend', navHTML);
    } else {
        // Для ПК оборачиваем контент в layout
        const content = document.getElementById('main-content');
        const layout = document.createElement('div');
        layout.className = 'layout';
        layout.innerHTML = navHTML;
        layout.appendChild(content.cloneNode(true));
        document.getElementById('app').appendChild(layout);
        // Удаляем старый контент
        content.remove();
        // Называем новый контент правильным ID
        layout.querySelector('.content').id = 'main-content';
    }
    // Обработчики кликов
    document.querySelectorAll('.nav-btn, .side-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function getIcon(tab) {
    const icons = {
        home: '🏠', cases: '🎰', profile: '👤', bonuses: '🎁', withdraw: '💸', shop: '🛍️'
    };
    return icons[tab] || '❓';
}

function getLabel(tab) {
    const labels = {
        home: 'Главная', cases: 'Кейсы', profile: 'Профиль', bonuses: 'Бонусы', withdraw: 'Вывод', shop: 'Магазин'
    };
    return labels[tab] || tab;
}

createNav();

// Переключение вкладок
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    document.querySelectorAll('.nav-btn, .side-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) btn.classList.add('active');
    });
}

// Загрузка данных
async function fetchBalance() {
    try {
        const res = await fetch(`${API_BASE}/api/me?user_id=${user.id}`, {
            headers: { 'X-Secret': SECRET }
        });
        const data = await res.json();
        if (!data.error) {
            document.getElementById('coins').textContent = data.balance;
            document.getElementById('cases-opened').textContent = data.cases_opened;
            document.getElementById('ref-link').textContent = data.ref_link;
            document.getElementById('profile-balance').textContent = data.balance + ' 🪙';
            document.getElementById('referrals').textContent = data.referrals || 0;
        }
    } catch (e) {
        console.error('Ошибка баланса:', e);
        // Демо-данные
        document.getElementById('coins').textContent = 1000;
        document.getElementById('cases-opened').textContent = 5;
        document.getElementById('ref-link').textContent = 'https://t.me/your_bot?start=' + user.id;
        document.getElementById('profile-balance').textContent = '1000 🪙';
        document.getElementById('referrals').textContent = 0;
    }
}

// Открытие монетного кейса
async function openCase(caseId) {
    showModal('Открываем кейс...');
    try {
        const res = await fetch(`${API_BASE}/api/open_case`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Secret': SECRET
            },
            body: JSON.stringify({ user_id: user.id, case_id: caseId })
        });
        const data = await res.json();
        if (data.error) {
            showResult('Ошибка', data.error);
        } else {
            document.getElementById('coins').textContent = data.balance;
            showResult('🎉 Выигрыш!', data.reward + ' 🪙');
        }
    } catch (e) {
        // Заглушка: случайный выигрыш
        const reward = Math.floor(Math.random() * 50) + 10;
        setTimeout(() => {
            showResult('🎉 Выигрыш!', reward + ' 🪙');
            document.getElementById('coins').textContent = parseInt(document.getElementById('coins').textContent) + reward;
        }, 1500);
    }
}

// Открытие звёздного кейса
function openStarCase(caseId) {
    showModal('Открываем звёздный кейс...');
    setTimeout(() => {
        const reward = caseId * 10;
        showResult('⭐ Выигрыш!', reward + ' 🪙');
    }, 1500);
}

// Ежедневный бонус (заглушка)
function claimDaily() {
    alert('Ежедневный бонус скоро будет доступен! (заглушка)');
}

// Вывод средств (заглушка)
function requestWithdraw() {
    const address = document.getElementById('withdraw-address').value;
    if (!address) {
        alert('Введите адрес кошелька');
        return;
    }
    // Здесь будет запрос к API
    alert('Запрос на вывод отправлен! (заглушка)');
}

// Копирование реферальной ссылки
function copyRefLink() {
    const link = document.getElementById('ref-link').textContent;
    tg.showPopup({ message: 'Скопируй ссылку: ' + link, buttons: [{ text: 'Ок' }] });
    navigator.clipboard.writeText(link).catch(() => {});
}

// Модалка
function showModal(text) {
    document.getElementById('open-modal').classList.remove('hidden');
    document.getElementById('result-text').textContent = text;
    document.getElementById('result-amount').textContent = '';
    const wheel = document.getElementById('case-wheel');
    wheel.style.animation = 'none';
    wheel.offsetHeight; // рестарт анимации
    wheel.style.animation = '';
}

function showResult(title, amount) {
    document.getElementById('result-text').textContent = title;
    document.getElementById('result-amount').textContent = amount;
    setTimeout(hideModal, 3000);
}

function hideModal() {
    document.getElementById('open-modal').classList.add('hidden');
}

// Скрыть загрузочный экран
document.getElementById('loader').classList.add('hidden');

// Запуск
fetchBalance();