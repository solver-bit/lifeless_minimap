let tg = window.Telegram?.WebApp;
if (!tg) {
    tg = {
        initDataUnsafe: { user: { id: 6335225528, first_name: "Тест" } },
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

// Текущий URL для API (замени на свой туннель/домен)
const API_BASE = "https://silver-toes-sing.loca.lt";
const SECRET = "my_super_secret_key";

let currentUserData = { balance: 0, stars: 0, cases_opened: 0, referrals: 0 };

// Обновление UI
function updateBalanceUI() {
    document.getElementById('coins').textContent = currentUserData.balance;
    document.getElementById('cases-opened').textContent = currentUserData.cases_opened;
    document.getElementById('profile-balance').textContent = currentUserData.balance + ' 🪙';
    document.getElementById('profile-stars').textContent = currentUserData.stars + ' ⭐';
    document.getElementById('referrals').textContent = currentUserData.referrals;
}

// Навигация
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

// Карусель
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

// Загрузка баланса (если API недоступен — ставим тестовые данные)
async function fetchBalance() {
    try {
        const res = await fetch(`${API_BASE}/api/me?user_id=${user.id}`, {
            headers: { 'X-Secret': SECRET }
        });
        const data = await res.json();
        if (!data.error) {
            currentUserData = data;
            updateBalanceUI();
        }
    } catch (e) {
        currentUserData = { balance: 1000, stars: 100, cases_opened: 5, referrals: 0 };
        updateBalanceUI();
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
}

// Покупка монет
function buyCoins(coinAmount, starCost) {
    if (currentUserData.stars < starCost) {
        alert('Недостаточно звёзд!');
        return;
    }
    currentUserData.stars -= starCost;
    currentUserData.balance += coinAmount;
    updateBalanceUI();
    closeTopUp();
    showPopup('Покупка!', `+${coinAmount} 🪙`);
}

function showPopup(title, amount) {
    document.getElementById('popup-title').textContent = title;
    document.getElementById('popup-amount').textContent = amount;
    document.getElementById('popup-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('popup-modal').classList.add('hidden'), 2000);
}

// Пополнение (открыть/закрыть)
function openTopUp() {
    document.getElementById('topup-modal').classList.remove('hidden');
}
function closeTopUp() {
    document.getElementById('topup-modal').classList.add('hidden');
}

// Открытие кейса
async function openCase(caseId) {
    if (currentUserData.balance < parseInt(caseId)) {
        alert('Недостаточно монет!');
        return;
    }
    // Простая имитация выигрыша
    const reward = Math.floor(Math.random() * (parseInt(caseId) * 1.5)) + 5;
    currentUserData.balance -= parseInt(caseId);
    currentUserData.balance += reward;
    currentUserData.cases_opened++;
    updateBalanceUI();
    showPopup('🎉 Выигрыш!', `+${reward} 🪙`);
}

function openStarCase(caseId) {
    if (currentUserData.stars < caseId) {
        alert('Недостаточно звёзд!');
        return;
    }
    currentUserData.stars -= caseId;
    const reward = Math.floor(Math.random() * (caseId * 15)) + 10;
    currentUserData.balance += reward;
    currentUserData.cases_opened++;
    updateBalanceUI();
    showPopup('⭐ Выигрыш!', `+${reward} 🪙`);
}

// Колесо
const prizes = [5, 10, 15, 20, 0, 25, 30, 10];
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
    if (currentUserData.stars < 10) {
        alert('Нужно 10 звёзд!');
        return;
    }
    isSpinning = true;
    currentUserData.stars -= 10;
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
        currentUserData.balance += prize;
        updateBalanceUI();
        document.getElementById('wheel-result').textContent = `Выигрыш: ${prize} 🪙`;
        isSpinning = false;
    }, 3000);
}

// Сапёр
const SAPER_SIZE = 5;
const SAPER_MINES = 7;
const SAPER_COST = 25;
let saperStarted = false;
function startSaper() {
    if (!saperStarted && currentUserData.stars < SAPER_COST) {
        alert('Нужно 25 звёзд!');
        return;
    }
    if (!saperStarted) {
        currentUserData.stars -= SAPER_COST;
        updateBalanceUI();
    }
    saperStarted = true;
    document.getElementById('saper-result').textContent = '';
    const grid = document.getElementById('saper-grid');
    grid.innerHTML = '';
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
                currentUserData.balance += 3;
                updateBalanceUI();
                if (openedSafe === totalSafe) {
                    document.getElementById('saper-result').textContent = 'Победа! +50 бонус';
                    currentUserData.balance += 50;
                    updateBalanceUI();
                    saperStarted = false;
                }
            }
        };
        grid.appendChild(cell);
    }
}

// Кости
function rollDice() {
    if (currentUserData.stars < 10) {
        alert('Нужно 10 звёзд!');
        return;
    }
    currentUserData.stars -= 10;
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2;
    let reward = 0;
    if (sum === 7 || sum === 11) reward = 25;
    else if (sum === 12) reward = 50;
    else if (sum === 2) reward = 10;
    currentUserData.balance += reward;
    updateBalanceUI();
    document.getElementById('dice1').textContent = d1;
    document.getElementById('dice2').textContent = d2;
    document.getElementById('dice-result').textContent = `Сумма: ${sum} | Выигрыш: ${reward} 🪙`;
}

// Прочее
function claimDaily() {
    currentUserData.balance += 20;
    updateBalanceUI();
    alert('Ежедневный бонус +20 монет!');
}
function copyRefLink() {
    const link = document.getElementById('ref-link').textContent;
    tg.showPopup({ message: 'Скопируй ссылку: ' + link, buttons: [{ text: 'Ок' }] });
    navigator.clipboard.writeText(link).catch(() => {});
}

// Инициализация
document.getElementById('loader').classList.add('hidden');
fetchBalance();
createWheel();