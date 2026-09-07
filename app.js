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

const API_BASE = "https://silver-toes-sing.loca.lt";
const SECRET = "my_super_secret_key";

let currentUserData = { balance: 0, stars: 0, cases_opened: 0 };

function updateBalanceUI() {
    document.getElementById('coins').textContent = currentUserData.balance;
    document.getElementById('stars').textContent = currentUserData.stars;
    document.getElementById('profile-balance').textContent = currentUserData.balance + ' 🪙';
    document.getElementById('profile-stars').textContent = currentUserData.stars + ' ⭐';
    document.getElementById('cases-opened').textContent = currentUserData.cases_opened;
}

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
        console.log('API недоступен, используем локальные данные', e);
    }
}

async function buyCoins(coinAmount, starCost) {
    const res = await fetch(`${API_BASE}/api/buy_coins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Secret': SECRET },
        body: JSON.stringify({ user_id: user.id, coins: coinAmount })
    });
    const data = await res.json();
    if (data.invoice_link) {
        // Открываем окно оплаты прямо в Telegram
        tg.openLink(data.invoice_link);
    } else {
        alert('Ошибка создания платежа');
    }
}

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
            currentUserData.balance = data.balance;
            updateBalanceUI();
            showResult('🎉 Выигрыш!', `+${data.reward} 🪙`);
        }
    } catch (e) {
        showResult('Ошибка', 'Проверь соединение');
    }
}

async function spinWheel() {
    const wheel = document.getElementById('wheel');
    const segmentAngle = 360 / prizes.length;
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetRotation = currentRotation + extraSpins * 360 + (randomIndex * segmentAngle);

    wheel.style.transition = 'none';
    wheel.style.transform = `rotate(${currentRotation}deg)`;
    void wheel.offsetWidth;
    wheel.style.transition = 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    wheel.style.transform = `rotate(${targetRotation}deg)`;
    currentRotation = targetRotation;

    try {
        const res = await fetch(`${API_BASE}/api/spin_wheel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Secret': SECRET },
            body: JSON.stringify({ user_id: user.id })
        });
        const data = await res.json();
        if (data.error) {
            alert(data.error);
        } else {
            currentUserData.balance = data.balance;
            currentUserData.stars = data.stars;
            updateBalanceUI();
            setTimeout(() => {
                document.getElementById('wheel-result').textContent = `Выигрыш: ${data.reward} 🪙`;
            }, 3000);
        }
    } catch (e) {
        setTimeout(() => {
            document.getElementById('wheel-result').textContent = 'Ошибка!';
        }, 3000);
    }
}

// Остальные функции (createWheel, startSaper, rollDice, modal) - можно оставить как есть, но с учетом данных от API, либо заменить на аналогичные fetch запросы.
// Для скорости оставляю логику сапера на фронте, а начисление монет через /api/play_saper (если добавишь) или локально.
// Но обязательно подключи fetchBalance в конце.
fetchBalance();
createWheel();