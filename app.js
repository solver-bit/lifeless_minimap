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

const API_BASE = "https://ваш-домен.ru"; // замени после покупки сервера
const SECRET = "my_super_secret_key";

// ---------- НАВИГАЦИЯ ----------
function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) btn.classList.add('active');
    });
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ---------- КАРУСЕЛЬ ----------
let currentSlide = 0;
const track = document.getElementById('carousel-track');
const slides = document.querySelectorAll('.carousel-slide');
const slideCount = slides.length;

function showSlide(index) {
    currentSlide = (index + slideCount) % slideCount;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
}
function nextSlide() { showSlide(currentSlide + 1); }
function prevSlide() { showSlide(currentSlide - 1); }

setInterval(nextSlide, 5000);

// ---------- БАЛАНС ----------
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
        document.getElementById('coins').textContent = 1000;
        document.getElementById('cases-opened').textContent = 5;
        document.getElementById('ref-link').textContent = 'https://t.me/your_bot?start=' + user.id;
        document.getElementById('profile-balance').textContent = '1000 🪙';
        document.getElementById('referrals').textContent = 0;
    }
}

// ---------- КЕЙСЫ ----------
async function openCase(caseId) {
    showModal('Открываем кейс...');
    try {
        const res = await fetch(`${API_BASE}/api/open_case`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Secret': SECRET },
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
        const reward = Math.floor(Math.random() * 50) + 10;
        setTimeout(() => {
            showResult('🎉 Выигрыш!', reward + ' 🪙');
            document.getElementById('coins').textContent = parseInt(document.getElementById('coins').textContent) + reward;
        }, 1500);
    }
}

function openStarCase(caseId) {
    showModal('Открываем звёздный кейс...');
    setTimeout(() => {
        const reward = caseId * 10;
        showResult('⭐ Выигрыш!', reward + ' 🪙');
    }, 1500);
}

// ---------- КОЛЕСО ФОРТУНЫ ----------
function spinWheel() {
    const wheel = document.getElementById('wheel-img');
    const prizes = [10, 20, 50, 100, 0, 200, 500, 25];
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const segmentSize = 360 / prizes.length;
    const rotation = 360 * 5 + (randomIndex * segmentSize) - (segmentSize / 2);

    wheel.style.transition = 'transform 3s ease-out';
    wheel.style.transform = `rotate(${rotation}deg)`;

    setTimeout(() => {
        const prize = prizes[randomIndex];
        document.getElementById('wheel-result').textContent = `Выигрыш: ${prize} 🪙`;
    }, 3000);
}

// ---------- САПЁР ----------
let saperStarted = false;
function startSaper() {
    const grid = document.getElementById('saper-grid');
    grid.innerHTML = '';
    saperStarted = true;
    document.getElementById('saper-result').textContent = '';
    const mineIndex = Math.floor(Math.random() * 25);

    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.onclick = () => {
            if (!saperStarted) return;
            if (i === mineIndex) {
                cell.textContent = '💣';
                cell.classList.add('mine');
                document.getElementById('saper-result').textContent = 'Ты проиграл!';
                saperStarted = false;
                grid.querySelectorAll('.cell').forEach(c => c.style.pointerEvents = 'none');
            } else {
                cell.textContent = '✅';
                cell.classList.add('opened');
                // Можно дать бонус
            }
        };
        grid.appendChild(cell);
    }
}

// ---------- КОСТИ ----------
function rollDice() {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    document.getElementById('dice1').textContent = d1;
    document.getElementById('dice2').textContent = d2;
    document.getElementById('dice-result').textContent = `Сумма: ${d1 + d2}`;
}

// ---------- ОБЩИЕ ФУНКЦИИ ----------
function claimDaily() {
    alert('Ежедневный бонус скоро будет доступен!');
}

function copyRefLink() {
    const link = document.getElementById('ref-link').textContent;
    tg.showPopup({ message: 'Скопируй ссылку: ' + link, buttons: [{ text: 'Ок' }] });
    navigator.clipboard.writeText(link).catch(() => {});
}

function showModal(text) {
    document.getElementById('open-modal').classList.remove('hidden');
    document.getElementById('result-text').textContent = text;
    document.getElementById('result-amount').textContent = '';
    const wheel = document.getElementById('case-wheel');
    wheel.style.animation = 'none';
    wheel.offsetHeight;
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

// ---------- ИНИЦИАЛИЗАЦИЯ ----------
document.getElementById('loader').classList.add('hidden');
fetchBalance();
startSaper(); // Запускаем сапёр для первой генерации (перезапустится при клике)