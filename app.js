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

// Локальные данные для теста
let userCoins = 1000;
let userStars = 100;
let casesOpened = 0;
let referrals = 0;
const API_BASE = "https://silver-toes-sing.loca.lt";
const SECRET = "my_super_secret_key";

// Обновление баланса на экране
function updateBalanceUI() {
    document.getElementById('coins').textContent = userCoins;
    document.getElementById('stars').textContent = userStars;
    document.getElementById('profile-balance').textContent = userCoins + ' 🪙';
    document.getElementById('profile-stars').textContent = userStars + ' ⭐';
    document.getElementById('cases-opened').textContent = casesOpened;
    document.getElementById('referrals').textContent = referrals;
}

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
setInterval(nextSlide, 10000);

// ---------- ПОКУПКА МОНЕТ ЗА ЗВЁЗДЫ ----------
function buyCoins(coinAmount, starCost) {
    if (userStars < starCost) {
        alert('Недостаточно звёзд!');
        return;
    }
    userStars -= starCost;
    userCoins += coinAmount;
    updateBalanceUI();
    showResult('Покупка!', `+${coinAmount} 🪙`);
}

// ---------- КЕЙСЫ ----------
async function openCase(caseId) {
    showModal('Открываем кейс...');
    const cost = parseInt(caseId);
    if (userCoins < cost) {
        showResult('Ошибка', 'Недостаточно монет');
        return;
    }
    userCoins -= cost;
    // Простая имитация выигрыша
    const reward = Math.floor(Math.random() * (cost * 1.5)) + 5;
    userCoins += reward;
    casesOpened++;
    updateBalanceUI();
    setTimeout(() => {
        showResult('🎉 Выигрыш!', `+${reward} 🪙`);
    }, 1500);
}

function openStarCase(caseId) {
    showModal('Открываем звёздный кейс...');
    const cost = parseInt(caseId);
    if (userStars < cost) {
        showResult('Ошибка', 'Недостаточно звёзд');
        return;
    }
    userStars -= cost;
    const reward = Math.floor(Math.random() * (cost * 15)) + 10;
    userCoins += reward;
    casesOpened++;
    updateBalanceUI();
    setTimeout(() => {
        showResult('⭐ Выигрыш!', `+${reward} 🪙`);
    }, 1500);
}

// ---------- КОЛЕСО ФОРТУНЫ ----------
const prizes = [5, 10, 15, 20, 0, 25, 30, 10]; // уменьшенные призы
const colors = ['#ffd700', '#00aaff', '#ffffff', '#ff3b3b', '#ffd700', '#00aaff', '#ffffff', '#ff3b3b'];

function createWheel() {
    const wheel = document.getElementById('wheel');
    wheel.innerHTML = '';
    const segmentAngle = 360 / prizes.length;

    prizes.forEach((prize, i) => {
        const segment = document.createElement('div');
        segment.className = 'wheel-segment';
        segment.style.background = colors[i];
        segment.style.transform = `rotate(${i * segmentAngle}deg)`;
        segment.style.setProperty('--angle', `${i * segmentAngle}deg`);

        const span = document.createElement('span');
        span.textContent = prize + '🪙';
        segment.appendChild(span);
        wheel.appendChild(segment);
    });
}

let currentRotation = 0;
let isSpinning = false;

function spinWheel() {
    if (isSpinning) return;
    if (userStars < 10) {
        alert('Нужно 10 звёзд!');
        return;
    }
    isSpinning = true;
    userStars -= 10;
    updateBalanceUI();

    const wheel = document.getElementById('wheel');
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const segmentAngle = 360 / prizes.length;
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetRotation = currentRotation + extraSpins * 360 + (randomIndex * segmentAngle);

    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(${currentRotation}deg)`;
    void wheel.offsetWidth;
    wheel.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    wheel.style.transform = `rotate(${targetRotation}deg)`;
    currentRotation = targetRotation;

    setTimeout(() => {
        const prize = prizes[randomIndex];
        if (prize > 0) userCoins += prize;
        updateBalanceUI();
        document.getElementById('wheel-result').textContent = `Выигрыш: ${prize} 🪙`;
        isSpinning = false;
    }, 3000);
}

// ---------- САПЁР (25 звёзд, много бомб, малые выигрыши) ----------
const SAPER_SIZE = 5;
const SAPER_MINES = 7; // больше бомб
const SAPER_COST = 25; // вход 25 звёзд
let saperStarted = false;

function startSaper() {
    if (!saperStarted && userStars < SAPER_COST) {
        alert('Нужно 25 звёзд!');
        return;
    }
    if (!saperStarted) {
        userStars -= SAPER_COST;
        updateBalanceUI();
    }
    saperStarted = true;
    document.getElementById('saper-result').textContent = '';
    const grid = document.getElementById('saper-grid');
    grid.innerHTML = '';
    // Генерируем бомбы
    const minePositions = new Set();
    while (minePositions.size < SAPER_MINES) {
        minePositions.add(Math.floor(Math.random() * (SAPER_SIZE * SAPER_SIZE)));
    }
    let openedSafe = 0;
    const totalSafe = SAPER_SIZE * SAPER_SIZE - SAPER_MINES;

    for (let i = 0; i < SAPER_SIZE * SAPER_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.onclick = () => {
            if (!saperStarted) return;
            if (minePositions.has(i)) {
                cell.textContent = '💣';
                cell.classList.add('mine');
                document.getElementById('saper-result').textContent = 'Проигрыш!';
                saperStarted = false;
                grid.querySelectorAll('.cell').forEach(c => c.style.pointerEvents = 'none');
            } else {
                cell.textContent = '✅';
                cell.classList.add('opened');
                openedSafe++;
                // За каждую безопасную клетку даём 3 монеты
                userCoins += 3;
                updateBalanceUI();
                if (openedSafe === totalSafe) {
                    document.getElementById('saper-result').textContent = 'Победа! +50 бонус';
                    userCoins += 50;
                    updateBalanceUI();
                    saperStarted = false;
                }
            }
        };
        grid.appendChild(cell);
    }
}

// ---------- КОСТИ (10 звёзд, малый выигрыш) ----------
function rollDice() {
    if (userStars < 10) {
        alert('Нужно 10 звёзд!');
        return;
    }
    userStars -= 10;
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2;
    let reward = 0;
    if (sum === 7 || sum === 11) reward = 25;
    else if (sum === 12) reward = 50;
    else if (sum === 2) reward = 10;
    userCoins += reward;
    updateBalanceUI();
    document.getElementById('dice1').textContent = d1;
    document.getElementById('dice2').textContent = d2;
    document.getElementById('dice-result').textContent = `Сумма: ${sum} | Выигрыш: ${reward} 🪙`;
}

// ---------- ОБЩИЕ ФУНКЦИИ ----------
function claimDaily() {
    userCoins += 20;
    updateBalanceUI();
    alert('Ежедневный бонус +20 монет!');
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
updateBalanceUI();
fetchBalance();
createWheel();
startSaper(); // предзаполним поле для первого отображения (не списывая звёзды)

async function fetchBalance() {
    // Заглушка, позже заменим на реальный API
    try {
        const res = await fetch(`${API_BASE}/api/me?user_id=${user.id}`, {
            headers: { 'X-Secret': SECRET }
        });
        const data = await res.json();
        if (!data.error) {
            userCoins = data.balance || 1000;
            userStars = data.stars || 100;
            casesOpened = data.cases_opened || 0;
            referrals = data.referrals || 0;
            updateBalanceUI();
        }
    } catch (e) {
        console.log('API недоступен, используем локальные данные');
    }
}