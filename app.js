/* ============================================================
   LIFELESS SHOP · WebApp Frontend
   ============================================================ */

// ---------- Telegram WebApp ----------
let tg = window.Telegram?.WebApp;
const IS_DEV = !tg || !tg.initData;
if (!tg) {
    // Заглушка для разработки
    tg = {
        initData: "",
        initDataUnsafe: { user: { id: 0, first_name: "Гость", username: "guest" } },
        expand: () => {}, close: () => {},
        showPopup: (o) => alert(o.message || o.title || ""),
        openTelegramLink: (u) => window.open(u, "_blank"),
        openLink: (u) => window.open(u, "_blank"),
        sendData: () => {},
        HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {} },
    };
} else {
    tg.expand();
    tg.setHeaderColor?.("#06060f");
    tg.setBackgroundColor?.("#06060f");
    tg.enableClosingConfirmation?.();
}

const API_BASE = location.origin; // при деплое на одном домене

let currentUser = { id: 0, balance: 0, cases_opened: 0, referrals: 0, username: "" };
let state = { spinning: false, rolling: false, saperActive: false, caseOpening: false };

// ---------- Утилиты ----------
function haptic(type = "light") {
    try { tg.HapticFeedback?.impactOccurred(type); } catch (_) {}
}
function hapticNotify(type = "success") {
    try { tg.HapticFeedback?.notificationOccurred(type); } catch (_) {}
}

function toast(msg, type = "info", ms = 2500) {
    const cont = document.getElementById("toast-container");
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    cont.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(120%)"; el.style.transition = "0.3s"; }, ms);
    setTimeout(() => el.remove(), ms + 400);
}

async function api(path, body = null, method = null) {
    const headers = { "X-Init-Data": tg.initData || "" };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API_BASE}${path}`, {
        method: method || (body ? "POST" : "GET"),
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Ошибка запроса");
    return data;
}

function openLink(url) {
    if (tg.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank");
}

// ---------- Обновление UI баланса ----------
function setBalance(v, animate = true) {
    currentUser.balance = v;
    const el = document.getElementById("coins");
    el.textContent = v.toLocaleString("ru-RU");
    if (animate) {
        const pill = document.getElementById("balance-pill");
        pill.classList.add("bump");
        setTimeout(() => pill.classList.remove("bump"), 300);
    }
    const prof = document.getElementById("profile-balance");
    if (prof) prof.textContent = v.toLocaleString("ru-RU");
}

// ============================================================
//                    ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function bootstrap() {
    try {
        await Promise.all([loadMe(), loadLeaderboard()]);
        buildCases();
        buildCarouselDots();
        buildTopUpOptions();
        buildWheel();
        setInterval(nextSlide, 6000);
    } catch (e) {
        console.error(e);
        toast("Ошибка загрузки профиля", "error");
    } finally {
        document.getElementById("global-loader").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
    }
}

async function loadMe() {
    const data = await api("/api/me");
    Object.assign(currentUser, data);
    setBalance(data.balance, false);

    // Профиль
    const u = tg.initDataUnsafe?.user || {};
    const avatarUrl = u.photo_url || `https://placehold.co/200x200/0a0a1a/ffd700?text=${encodeURIComponent((u.first_name || "U").charAt(0))}`;
    document.getElementById("profile-avatar").src = avatarUrl;
    document.getElementById("profile-name").textContent =
        [u.first_name, u.last_name].filter(Boolean).join(" ") || data.username;
    document.getElementById("profile-username").textContent = u.username ? `@${u.username}` : `ID: ${u.id}`;
    document.getElementById("profile-badge").textContent = `#${data.rank} из ${data.total_users}`;
    document.getElementById("profile-cases").textContent = data.cases_opened;
    document.getElementById("profile-stars").textContent = data.stars_spent;
    document.getElementById("profile-refs").textContent = data.referrals;
    document.getElementById("ref-link").textContent = data.ref_link;

    document.getElementById("happy-banner").style.display = data.happy_hours ? "block" : "none";
}

async function loadLeaderboard() {
    try {
        const { top } = await api("/api/leaderboard");
        const box = document.getElementById("leaderboard-list");
        box.innerHTML = top.map(u => `
            <div class="leader-row">
                <div class="leader-rank ${u.rank === 1 ? 'gold' : u.rank === 2 ? 'silver' : u.rank === 3 ? 'bronze' : ''}">#${u.rank}</div>
                <div class="leader-name">${u.username}</div>
                <div class="leader-balance">${u.balance.toLocaleString("ru-RU")} 🪙</div>
            </div>
        `).join("") || "<div style='color:#8a8aa0;font-size:13px;text-align:center;padding:12px'>Пока никого нет</div>";
    } catch (_) {}
}

// ============================================================
//                    НАВИГАЦИЯ
// ============================================================
function switchTab(tabId) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.getElementById(`tab-${tabId}`)?.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    haptic("light");
    window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll(".nav-btn").forEach(btn =>
    btn.addEventListener("click", () => switchTab(btn.dataset.tab))
);

// ============================================================
//                    CAROUSEL
// ============================================================
let currentSlide = 0;
function buildCarouselDots() {
    const track = document.getElementById("carousel-track");
    const n = track.children.length;
    const dots = document.getElementById("carousel-dots");
    dots.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i === 0 ? 'active' : ''}"></i>`).join("");
}
function showSlide(i) {
    const track = document.getElementById("carousel-track");
    const n = track.children.length;
    currentSlide = ((i % n) + n) % n;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    document.querySelectorAll("#carousel-dots i").forEach((d, idx) =>
        d.classList.toggle("active", idx === currentSlide)
    );
}
function nextSlide() { showSlide(currentSlide + 1); }
function prevSlide() { showSlide(currentSlide - 1); }

// ============================================================
//                    CASES
// ============================================================
const CASES = [
    { id: "10",    name: "Пыль",        price: 10,    emoji: "📦" },
    { id: "50",    name: "Пепел",       price: 50,    emoji: "💼" },
    { id: "250",   name: "Мелл",        price: 250,   emoji: "🔥" },
    { id: "1000",  name: "Telega",      price: 1000,  emoji: "💎" },
    { id: "5000",  name: "Оникс",       price: 5000,  emoji: "👑" },
    { id: "10000", name: "Бездна",      price: 10000, emoji: "🌌" },
];

const RARITIES = [
    { key: "common",    weight: 40, label: "Обычный",   emoji: "📦", color: "#a0a0b0" },
    { key: "uncommon",  weight: 25, label: "Хороший",   emoji: "✨", color: "#22dd88" },
    { key: "rare",      weight: 18, label: "Редкий",    emoji: "💎", color: "#00aaff" },
    { key: "epic",      weight: 12, label: "Эпик",      emoji: "🔥", color: "#c04cff" },
    { key: "legendary", weight: 4,  label: "Легенда",   emoji: "👑", color: "#ffd700" },
    { key: "jackpot",   weight: 1,  label: "JACKPOT",   emoji: "🌟", color: "#ff3b5b" },
];

function buildCases() {
    const grid = document.getElementById("cases-grid");
    grid.innerHTML = CASES.map(c => `
        <button class="case-btn" data-case="${c.id}">
            <div class="case-icon">${c.emoji}</div>
            <div class="case-name">${c.name}</div>
            <div class="case-price">${c.price.toLocaleString("ru-RU")} 🪙</div>
        </button>
    `).join("");
    grid.querySelectorAll(".case-btn").forEach(btn =>
        btn.addEventListener("click", () => openCase(btn.dataset.case))
    );
}

function pickRandomRarity() {
    const total = RARITIES.reduce((s, r) => s + r.weight, 0);
    let r = Math.random() * total;
    for (const rr of RARITIES) {
        if ((r -= rr.weight) <= 0) return rr;
    }
    return RARITIES[0];
}

async function openCase(caseId) {
    if (state.caseOpening) return;
    const caseData = CASES.find(c => c.id === caseId);
    if (!caseData) return;
    if (currentUser.balance < caseData.price) {
        toast("Недостаточно монет", "error");
        hapticNotify("error");
        return;
    }

    state.caseOpening = true;
    haptic("medium");

    // Готовим ленту: 60 рандомных предметов + победитель в позиции 50
    const WINNER_INDEX = 50;
    const reel = document.getElementById("case-reel");
    reel.innerHTML = "";
    reel.style.transition = "none";
    reel.style.transform = "translateX(0)";

    const items = [];
    for (let i = 0; i < 60; i++) items.push(pickRandomRarity());

    // Плейсхолдер победителя — потом подменим реальным исходом с сервера
    const placeholderWinner = { ...pickRandomRarity(), label: "?" };
    items[WINNER_INDEX] = placeholderWinner;

    items.forEach((it, i) => {
        const div = document.createElement("div");
        div.className = `case-item r-${it.key}`;
        div.dataset.idx = i;
        div.innerHTML = `${it.emoji}<small>${it.label}</small>`;
        reel.appendChild(div);
    });

    // Открываем модалку
    document.getElementById("case-modal").classList.remove("hidden");
    document.getElementById("case-modal-result").innerHTML = "&nbsp;";

    // Считаем позицию: хотим, чтобы победитель оказался ровно под маркером
    const wrap = document.querySelector(".case-reel-wrap");
    const wrapWidth = wrap.clientWidth;
    const itemWidth = 100 + 8; // width + gap
    const targetX = -(WINNER_INDEX * itemWidth + itemWidth / 2 - wrapWidth / 2);
    // Небольшой рандомный сдвиг внутри победителя
    const jitter = (Math.random() - 0.5) * (itemWidth * 0.6);
    const finalX = targetX + jitter;

    // Запускаем анимацию
    await new Promise(r => setTimeout(r, 50));
    reel.style.transition = "transform 6s cubic-bezier(0.15, 0.9, 0.15, 1)";
    reel.style.transform = `translateX(${finalX}px)`;

    // Параллельно делаем запрос к серверу
    let result = null;
    try {
        result = await api("/api/open_case", { case_id: caseId });
    } catch (e) {
        toast(e.message, "error");
        document.getElementById("case-modal").classList.add("hidden");
        state.caseOpening = false;
        return;
    }

    // Через 6 секунд анимация закончилась → показываем результат
    setTimeout(() => {
        // Подсветка выигравшего
        reel.children[WINNER_INDEX]?.classList.add("case-winner");

        const resEl = document.getElementById("case-modal-result");
        if (result.win) {
            const cls = result.jackpot ? "r-jackpot" : "r-legendary";
            resEl.innerHTML = `
                <span style="color:${result.jackpot ? '#ff3b5b' : '#ffd700'};text-shadow:0 0 25px currentColor">
                    ${result.jackpot ? "🎉 JACKPOT! " : "🏆 ПОБЕДА! "}
                    +${result.reward.toLocaleString("ru-RU")} 🪙
                </span>
                <div style="margin-top:10px;font-size:13px;color:#8a8aa0">
                    x${result.multiplier} · RTP ${(result.rtp * 100).toFixed(0)}%
                </div>
            `;
            hapticNotify("success");
            setBalance(result.balance);
        } else {
            resEl.innerHTML = `<span style="color:#ff3b5b">💔 Проигрыш · 0 🪙</span>`;
            hapticNotify("error");
            setBalance(result.balance);
        }

        // Через 2.5 сек закрываем модалку
        setTimeout(() => {
            document.getElementById("case-modal").classList.add("hidden");
            state.caseOpening = false;
        }, 2500);

    }, 6100);
}

// ============================================================
//                    WHEEL
// ============================================================
const WHEEL_PRIZES = [0, 5, 10, 15, 20, 25, 30, 50];
const WHEEL_COLORS = ["#ff3b5b", "#ffd700", "#00aaff", "#ffffff", "#22dd88", "#ffd700", "#00aaff", "#c04cff"];

let wheelRotation = 0;

function buildWheel() {
    const inner = document.getElementById("wheel-inner");
    inner.innerHTML = "";
    const total = WHEEL_PRIZES.length;
    const seg = 360 / total;

    WHEEL_PRIZES.forEach((prize, i) => {
        const label = document.createElement("div");
        label.className = "wheel-seg-label";
        // Каждый сегмент начинается с 0° и центр его — i*seg + seg/2
        // Рисуем через transform от центра
        const angle = i * seg + seg / 2;
        label.style.transform = `rotate(${angle}deg) translate(85px, 0)`;
        label.textContent = prize === 0 ? "💀" : prize + "🪙";
        inner.appendChild(label);
    });

    // Хаб по центру
    if (!document.querySelector(".wheel-hub")) {
        const hub = document.createElement("div");
        hub.className = "wheel-hub";
        hub.textContent = "🎯";
        document.querySelector(".wheel").appendChild(hub);
    }
}

async function spinWheel() {
    if (state.spinning) return;
    if (currentUser.balance < 10) { toast("Нужно 10 🪙", "error"); return; }
    state.spinning = true;
    haptic("medium");

    const wheelEl = document.getElementById("wheel");
    const resultEl = document.getElementById("wheel-result");
    const btn = document.getElementById("spin-btn");
    btn.disabled = true;
    resultEl.textContent = "";
    resultEl.className = "game-result";

    // Сначала запросим сервер, чтобы узнать итоговый индекс
    let result;
    try {
        result = await api("/api/spin_wheel");
    } catch (e) {
        toast(e.message, "error");
        state.spinning = false;
        btn.disabled = false;
        return;
    }

    const seg = 360 / WHEEL_PRIZES.length;
    // Хотим попасть на центр сегмента result.index
    // Указатель сверху = 0° по часовой? Вращаем так, чтобы сегмент оказался под указателем (сверху).
    // Сегмент i находится между i*seg и (i+1)*seg. Центр = i*seg + seg/2.
    // Чтобы центр оказался вверху (0° от указателя), нужно повернуть на -(i*seg + seg/2) + 360*k
    const targetAngle = 360 * 6 + (360 - (result.index * seg + seg / 2));
    wheelRotation += targetAngle;

    wheelEl.style.transform = `rotate(${wheelRotation}deg)`;

    // Ждём анимацию (5 секунд)
    setTimeout(() => {
        if (result.win) {
            resultEl.textContent = `🎉 +${result.reward} 🪙`;
            resultEl.classList.add("win");
            hapticNotify("success");
        } else {
            resultEl.textContent = "💀 Пусто";
            resultEl.classList.add("lose");
            hapticNotify("error");
        }
        setBalance(result.balance);
        state.spinning = false;
        btn.disabled = false;
    }, 5100);
}

// ============================================================
//                    DICE 3D
// ============================================================
const DICE_ROTATIONS = {
    1: { x: 0,   y: 0   },   // front  = ⚀
    2: { x: -90, y: 0   },   // bottom = ⚁
    3: { x: 0,   y: -90 },   // right  = ⚂
    4: { x: 0,   y: 90  },   // left   = ⚃
    5: { x: 90,  y: 0   },   // top    = ⚄
    6: { x: 0,   y: 180 },   // back   = ⚅
};

async function rollDice() {
    if (state.rolling) return;
    if (currentUser.balance < 10) { toast("Нужно 10 🪙", "error"); return; }
    state.rolling = true;
    haptic("medium");

    const dice = document.getElementById("dice3d");
    const resultEl = document.getElementById("dice-result");
    resultEl.textContent = "";
    resultEl.className = "game-result";

    let result;
    try {
        result = await api("/api/roll_dice");
    } catch (e) {
        toast(e.message, "error");
        state.rolling = false;
        return;
    }

    // Оба кубика в одном кубе — покажем сумму через вращение
    // Берём первый кубик
    const rot = DICE_ROTATIONS[result.dice[0]] || DICE_ROTATIONS[1];
    const extraSpins = 360 * 3;
    dice.style.transition = "transform 2.2s cubic-bezier(0.3, 1.2, 0.4, 1)";
    dice.style.transform = `rotateX(${rot.x + extraSpins}deg) rotateY(${rot.y + extraSpins}deg)`;

    // Меняем эмодзи на грани, соответствующей выпавшему значению второго кубика
    const faces = ["front", "back", "right", "left", "top", "bottom"];
    const emojis = ["⚀","⚁","⚂","⚃","⚄","⚅"];
    faces.forEach(f => {
        const el = dice.querySelector(`.dice-face.${f}`);
        el.textContent = emojis[Math.floor(Math.random() * 6)];
    });

    setTimeout(() => {
        // Показываем выпавшие значения
        const faceEmoji1 = emojis[result.dice[0] - 1];
        const faceEmoji2 = emojis[result.dice[1] - 1];

        if (result.win) {
            resultEl.innerHTML = `🎲 ${faceEmoji1} + ${faceEmoji2} = <b>${result.total}</b> · <span style="color:#22dd88">+${result.reward} 🪙</span>`;
            resultEl.classList.add("win");
            hapticNotify("success");
        } else {
            resultEl.innerHTML = `🎲 ${faceEmoji1} + ${faceEmoji2} = <b>${result.total}</b> · <span style="color:#ff3b5b">проигрыш</span>`;
            resultEl.classList.add("lose");
            hapticNotify("error");
        }
        setBalance(result.balance);
        state.rolling = false;
    }, 2300);
}

// ============================================================
//                    SAPER
// ============================================================
async function startSaper() {
    if (state.saperActive) return;
    if (currentUser.balance < 25) { toast("Нужно 25 🪙", "error"); return; }

    let data;
    try {
        data = await api("/api/saper/start");
    } catch (e) {
        toast(e.message, "error");
        return;
    }

    setBalance(data.balance);
    state.saperActive = true;
    haptic("medium");

    const grid = document.getElementById("saper-grid");
    const resultEl = document.getElementById("saper-result");
    resultEl.textContent = "";
    grid.innerHTML = "";

    let safeOpened = 0;
    const btn = document.getElementById("saper-btn");
    btn.disabled = true;
    btn.textContent = "Игра идёт...";

    data.field.forEach((isMine, i) => {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.addEventListener("click", async () => {
            if (!state.saperActive || cell.classList.contains("opened") || cell.classList.contains("mine")) return;

            if (isMine) {
                cell.textContent = "💣";
                cell.classList.add("mine");
                state.saperActive = false;
                // Финалим — но так как игрок попал на мину, сервер всё равно начислит за прошлые
                await finishSaper(safeOpened);
            } else {
                cell.textContent = "✅";
                cell.classList.add("opened");
                safeOpened++;
                haptic("light");

                const totalSafe = data.field.filter(x => !x).length;
                if (safeOpened >= totalSafe) {
                    state.saperActive = false;
                    await finishSaper(safeOpened);
                }
            }
        });
        grid.appendChild(cell);
    });
}

async function finishSaper(safeOpened) {
    let result;
    try {
        result = await api("/api/saper/finish", { cells_opened: safeOpened });
    } catch (e) {
        toast(e.message, "error");
        return;
    }

    const resultEl = document.getElementById("saper-result");
    if (result.reward > 0) {
        resultEl.innerHTML = `<span style="color:#22dd88">✅ +${result.reward} 🪙 (${safeOpened} клеток)</span>`;
        resultEl.classList.add("win");
        hapticNotify("success");
    } else {
        resultEl.innerHTML = `<span style="color:#ff3b5b">💥 Минное поле · 0 🪙</span>`;
        resultEl.classList.add("lose");
        hapticNotify("error");
    }
    setBalance(result.balance);

    const btn = document.getElementById("saper-btn");
    btn.disabled = false;
    btn.textContent = "Новая игра";
}

// ============================================================
//                    SHOP / INVOICES
// ============================================================
const TOPUP_OPTIONS = [
    { coins: 100,  stars: 10 },
    { coins: 500,  stars: 50 },
    { coins: 2000, stars: 200 },
    { coins: 5000, stars: 500 },
];

function buildTopUpOptions() {
    const box = document.getElementById("topup-options");
    box.innerHTML = TOPUP_OPTIONS.map(o =>
        `<button onclick="buyCoins(${o.coins})">${o.coins} 🪙 · ${o.stars} ⭐</button>`
    ).join("");
}

async function buyCoins(coins) {
    haptic("medium");
    try {
        const data = await api("/api/invoice/coins", { coins });
        if (tg.openInvoice) {
            tg.openInvoice(data.invoice_link, (status) => {
                if (status === "paid") {
                    toast("Оплата прошла! Монеты зачислены", "success", 3500);
                    hapticNotify("success");
                    loadMe();
                } else if (status === "failed") {
                    toast("Оплата не прошла", "error");
                }
            });
        } else {
            tg.openLink(data.invoice_link);
        }
        closeModal("topup-modal");
    } catch (e) {
        toast(e.message, "error");
    }
}

function openTopUp() {
    document.getElementById("topup-modal").classList.remove("hidden");
    haptic("light");
}
function openCustomTopUp() {
    document.getElementById("custom-modal").classList.remove("hidden");
}
function submitCustomTopUp() {
    const v = parseInt(document.getElementById("custom-coins-input").value);
    if (!v || v < 100 || v > 100000) {
        toast("Введите число от 100 до 100 000", "error");
        return;
    }
    closeModal("custom-modal");
    buyCoins(v);
}
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

// ============================================================
//                    SUPPORT
// ============================================================
function openSupport() {
    document.getElementById("support-modal").classList.remove("hidden");
}
async function submitSupport() {
    const topic = document.getElementById("support-topic").value;
    const text = document.getElementById("support-text").value.trim();
    if (!text) { toast("Введите текст обращения", "error"); return; }
    try {
        const r = await api("/api/support", { topic, text });
        toast(`Отправлено (${r.delivered} адм.)`, "success");
        document.getElementById("support-text").value = "";
        closeModal("support-modal");
    } catch (e) {
        toast(e.message, "error");
    }
}

// ============================================================
//                    DAILY
// ============================================================
async function claimDaily() {
    const btn = document.getElementById("daily-btn");
    btn.disabled = true;
    try {
        const r = await api("/api/daily");
        setBalance(r.balance);
        toast(`Ежедневный бонус: +${r.reward} 🪙`, "success", 3500);
        hapticNotify("success");
    } catch (e) {
        toast(e.message, "error");
        btn.disabled = false;
    }
}

// ============================================================
//                    REFERRAL
// ============================================================
function copyRef() {
    const link = document.getElementById("ref-link").textContent;
    navigator.clipboard.writeText(link)
        .then(() => toast("Ссылка скопирована", "success"))
        .catch(() => toast("Не удалось скопировать", "error"));
}

// ---------- Старт ----------
window.addEventListener("load", bootstrap);