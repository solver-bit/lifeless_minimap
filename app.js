// Фоллбек для ПК (если открыто вне Telegram)
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
tg.expand();

let user = tg.initDataUnsafe?.user || { id: 0, first_name: "Гость" };
document.getElementById('user-id').textContent = user.id;

// ⚠️ Замени на реальный URL после покупки сервера
const API_BASE = "https://ваш-домен.ru";
const SECRET = "my_super_secret_key";

// Функция получения баланса и данных
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
        // Заглушка при отсутствии API
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
            // имитация обновления баланса
            document.getElementById('coins').textContent = parseInt(document.getElementById('coins').textContent) + reward;
        }, 1500);
    }
}

// Открытие звёздного кейса (заглушка)
function openStarCase(caseId) {
    showModal('Открываем звёздный кейс...');
    setTimeout(() => {
        showResult('⭐ Выигрыш!', caseId * 10 + ' 🪙');
    }, 1500);
}

// Ежедневный бонус (заглушка)
function claimDaily() {
    alert('Ежедневный бонус скоро будет доступен! (заглушка)');
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
}

function showResult(title, amount) {
    document.getElementById('result-text').textContent = title;
    document.getElementById('result-amount').textContent = amount;
    setTimeout(hideModal, 3000);
}

function hideModal() {
    document.getElementById('open-modal').classList.add('hidden');
}

// Переключение вкладок (общая функция)
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-btn[data-tab="${tabId}"]`)?.classList.add('active');

    document.querySelectorAll('.side-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.side-btn[data-tab="${tabId}"]`)?.classList.add('active');
}

// Привязка нижней навигации
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Привязка бокового меню (для ПК)
document.querySelectorAll('.side-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Инициализация
fetchBalance();