let tg = window.Telegram?.WebApp;
if (!tg) {
    // Локальная разработка
    tg = {
        initData: "user=%7B%22id%22%3A6335225528%7D&hash=test",
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

const API_BASE = "https://silver-toes-sing.loca.lt"; // замени после деплоя

let currentUserData = { balance: 0, cases_opened: 0, referrals: 0 };

async function apiFetch(path, body) {
    const headers = { 'X-Init-Data': tg.initData };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_BASE}${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Ошибка API');
    return data;
}

function updateBalanceUI() {
    document.getElementById('coins').textContent = currentUserData.balance;
    document.getElementById('cases-opened').textContent = currentUserData.cases_opened;
    document.getElementById('profile-balance').textContent = currentUserData.balance + ' 🪙';
    document.getElementById('referrals').textContent = currentUserData.referrals;
}

function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabId)?.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabId) btn.classList.add('active');
    });
}
document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

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
setInterval(nextSlide, 5000);

async function fetchBalance() {
    try {
        currentUserData = await apiFetch('/api/me');
        updateBalanceUI();
    } catch (e) {
        console.log('API недоступен, используем локальные данные', e);
        currentUserData = { balance: 1000, cases_opened: 5, referrals: 0 };
        updateBalanceUI();
    } finally {
        document.getElementById('loader')?.classList.add('hidden');
    }
}

// Кейсы
async function openCase(caseId) {
    try {
        const data = await apiFetch('/api/open_case', { case_id: caseId });
        currentUserData.balance = data.balance;
        currentUserData.cases_opened++;
        updateBalanceUI();
        showPopup('Выигрыш!', `+${data.reward} 🪙`);
    } catch (e) {
        alert(e.message);
    }
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
async function spinWheel() {
    if (isSpinning) return;
    isSpinning = true;
    const wheel = document.getElementById('wheel');
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const segmentAngle = 360 / prizes.length;
    const targetRotation = currentRotation + 5 * 360 + (randomIndex * segmentAngle);
    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(${currentRotation}deg)`;
    void wheel.offsetWidth;
    wheel.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    wheel.style.transform = `rotate(${targetRotation}deg)`;
    currentRotation = targetRotation;
    try {
        const data = await apiFetch('/api/spin_wheel');
        currentUserData.balance = data.balance;
        updateBalanceUI();
        setTimeout(() => {
            document.getElementById('wheel-result').textContent = `Выигрыш: ${data.reward} 🪙`;
        }, 3000);
    } catch (e) {
        alert(e.message);
        setTimeout(() => document.getElementById('wheel-result').textContent = 'Ошибка', 3000);
    }
    isSpinning = false;
}

// Сапёр
const SAPER_SIZE = 5, SAPER_MINES = 7;
let saperStarted = false;
async function startSaper() {
    if (!saperStarted) {
        try {
            await apiFetch('/api/play_saper', { cells_opened: 0 });
        } catch (e) { alert(e.message); return; }
    }
    saperStarted = true;
    const grid = document.getElementById('saper-grid');
    grid.innerHTML = '';
    const minePositions = new Set();
    while (minePositions.size < SAPER_MINES) minePositions.add(Math.floor(Math.random() * (SAPER_SIZE * SAPER_SIZE)));
    let openedSafe = 0;
    const totalSafe = SAPER_SIZE * SAPER_SIZE - SAPER_MINES;
    for (let i = 0; i < SAPER_SIZE * SAPER_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.onclick = async () => {
            if (!saperStarted) return;
            if (minePositions.has(i)) {
                cell.textContent = '💣';
                cell.classList.add('mine');
                document.getElementById('saper-result').textContent = 'Проигрыш!';
                saperStarted = false;
                grid.querySelectorAll('.cell').forEach(c => c.style.pointerEvents = 'none');
                const data = await apiFetch('/api/play_saper', { cells_opened: 0 });
                currentUserData.balance = data.balance;
                updateBalanceUI();
            } else {
                cell.textContent = '✅';
                cell.classList.add('opened');
                openedSafe++;
                const data = await apiFetch('/api/play_saper', { cells_opened: 1 });
                currentUserData.balance = data.balance;
                updateBalanceUI();
                if (openedSafe === totalSafe) {
                    document.getElementById('saper-result').textContent = 'Победа!';
                    saperStarted = false;
                }
            }
        };
        grid.appendChild(cell);
    }
}

// Кости
async function rollDice() {
    try {
        const data = await apiFetch('/api/roll_dice');
        document.getElementById('dice1').textContent = data.dice[0];
        document.getElementById('dice2').textContent = data.dice[1];
        document.getElementById('dice-result').textContent = `Выигрыш: ${data.reward} 🪙`;
        currentUserData.balance = data.balance;
        updateBalanceUI();
    } catch (e) { alert(e.message); }
}

// Магазин
async function buyCoins(coinAmount, starCost) {
    try {
        const data = await apiFetch('/api/create_invoice', { coins: coinAmount });
        tg.openLink(data.invoice_link);
    } catch (e) { alert(e.message); }
}

function openTopUp() { document.getElementById('topup-modal').classList.remove('hidden'); }
function closeTopUp() { document.getElementById('topup-modal').classList.add('hidden'); }

function claimDaily() {
    // Здесь можно сделать отдельный API-запрос, пока просто заглушка
    showPopup('Бонус', '+20 монет (демо)');
}

function showPopup(title, amount) {
    alert(`${title}: ${amount}`);
}

function copyRefLink() {
    const link = document.getElementById('ref-link').textContent;
    tg.showPopup({ message: 'Скопируй ссылку: ' + link, buttons: [{ text: 'Ок' }] });
    navigator.clipboard.writeText(link).catch(() => {});
}

// Инициализация
fetchBalance();
createWheel();