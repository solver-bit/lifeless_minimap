/* ============================================================
   LIFELESS SHOP · WebApp Logic (v6)
   ============================================================ */

const FORCE_DEMO = true;

let tg = window.Telegram?.WebApp;
const DEMO = FORCE_DEMO || !tg?.initData;

if (!tg) {
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
    try { tg.expand(); } catch (_) {}
    tg.setHeaderColor?.("#06060f");
    tg.setBackgroundColor?.("#06060f");
}

const API_BASE = location.origin;
const BOT_USERNAME = "Solver_Life_bot";

const TG_USER_ID = tg.initDataUnsafe?.user?.id || 0;
const LS_KEY = `lifeless_demo_v6_u${TG_USER_ID}`;

const defaultUser = {
    id: 0, first_name: "", last_name: "", username: "", avatar_url: "",
    balance: 0, cases_opened: 0, referrals: 0, stars_spent: 0,
    total_wagered: 0, best_drop: 0, drops: [], rank: 1, total_users: 1,
    ref_link: "", last_free_case: 0, last_daily: "",
};

let currentUser = { ...defaultUser };
const state = {
    spinning: false, rolling: false, caseOpening: false,
    saperActive: false, saperSafe: 0, saperTotal: 0, saperConfig: null,
};

/* УТИЛИТЫ */
function haptic(t = "light") { try { tg.HapticFeedback?.impactOccurred(t); } catch (_) {} }
function hapticNotify(t = "success") { try { tg.HapticFeedback?.notificationOccurred(t); } catch (_) {} }

function toast(msg, type = "info", ms = 2500) {
    const cont = document.getElementById("toast-container");
    if (!cont) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    cont.appendChild(el);
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translateX(120%)";
        el.style.transition = "0.3s";
    }, ms);
    setTimeout(() => el.remove(), ms + 400);
}

function openLink(url) {
    if (tg.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank");
}

function formatNum(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K";
    return String(n);
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}

function makeInitialsAvatar(firstName, lastName, username) {
    let letters = "";
    if (firstName) letters += firstName.charAt(0);
    if (lastName) letters += lastName.charAt(0);
    if (!letters) letters = (username || "?").charAt(0);
    letters = letters.toUpperCase();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#00aaff"/>
            <stop offset="50%" stop-color="#c04cff"/>
            <stop offset="100%" stop-color="#ffd700"/>
        </linearGradient></defs>
        <rect width="200" height="200" fill="#06060f"/>
        <circle cx="100" cy="100" r="90" fill="url(#g)" opacity="0.9"/>
        <text x="100" y="100" font-family="-apple-system,sans-serif" font-size="90"
              font-weight="900" fill="#06060f" text-anchor="middle" dominant-baseline="central">
            ${escapeHtml(letters)}
        </text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* DEMO DB */
function loadDemo() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            return {
                balance: typeof p.balance === "number" ? p.balance : 50000,
                cases_opened: p.cases_opened || 0,
                referrals: p.referrals || 0,
                stars_spent: p.stars_spent || 0,
                total_wagered: p.total_wagered || 0,
                best_drop: p.best_drop || 0,
                drops: Array.isArray(p.drops) ? p.drops : [],
                last_free_case: p.last_free_case || 0,
                last_daily: p.last_daily || "",
            };
        }
    } catch (_) {}
    return {
        balance: 50000, cases_opened: 0, referrals: 0, stars_spent: 0,
        total_wagered: 0, best_drop: 0, drops: [],
        last_free_case: 0, last_daily: "",
    };
}

function saveDemo() {
    if (!DEMO) return;
    try {
        localStorage.setItem(LS_KEY, JSON.stringify({
            balance: currentUser.balance,
            cases_opened: currentUser.cases_opened,
            referrals: currentUser.referrals,
            stars_spent: currentUser.stars_spent,
            total_wagered: currentUser.total_wagered,
            best_drop: currentUser.best_drop,
            drops: currentUser.drops.slice(0, 30),
            last_free_case: currentUser.last_free_case,
            last_daily: currentUser.last_daily,
        }));
    } catch (_) {}
}

function resetDemo() {
    if (!confirm("Сбросить весь прогресс? Баланс станет 50 000 🪙")) return;
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    location.reload();
}

/* ЭКОНОМИКА */
const CASE_COSTS = { "10": 10, "50": 50, "250": 250, "1000": 1000, "5000": 5000, "10000": 10000 };

const MULTIPLIERS = [0.0, 0.5, 1.0, 1.5, 2.0, 4.0];
const MULT_WEIGHTS = [40, 20, 20, 12, 6, 2];

const MULT_TO_RARITY = [
    { key: "common",    label: "Пусто",     emoji: "💨" },
    { key: "common",    label: "Обычный",   emoji: "📦" },
    { key: "uncommon",  label: "Хороший",   emoji: "✨" },
    { key: "rare",      label: "Редкий",    emoji: "💎" },
    { key: "epic",      label: "Эпик",      emoji: "🔥" },
    { key: "legendary", label: "ЛЕГЕНДА",   emoji: "👑" },
];

function pickMultiplierIndex() {
    const total = MULT_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < MULT_WEIGHTS.length; i++) {
        if ((r -= MULT_WEIGHTS[i]) <= 0) return i;
    }
    return 0;
}

function getRtp(cases) {
    if (cases < 4) return 1.15;
    if (cases < 6) return 1.15 - ((1.15 - 0.92) / 2) * (cases - 3);
    return 0.92;
}

function isHappyHours() {
    const h = new Date().getHours();
    return h >= 20 && h < 22;
}

function applyHappy(x) {
    return isHappyHours() ? Math.floor(x * 1.2) : x;
}

/* API */
async function apiCall(path, body = null) {
    if (DEMO) return demoApi(path, body);
    const headers = { "X-Init-Data": tg.initData || "" };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API_BASE}${path}`, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Ошибка запроса");
    return data;
}

async function demoApi(path, body) {
    await new Promise(r => setTimeout(r, 80));

    switch (path) {
        case "/api/me":
            return {
                id: currentUser.id, first_name: currentUser.first_name,
                last_name: currentUser.last_name, username: currentUser.username,
                avatar_url: currentUser.avatar_url,
                balance: currentUser.balance,
                cases_opened: currentUser.cases_opened,
                referrals: currentUser.referrals,
                stars_spent: currentUser.stars_spent,
                rank: currentUser.rank, total_users: currentUser.total_users,
                ref_link: currentUser.ref_link, is_admin: true,
                happy_hours: isHappyHours(),
            };

        case "/api/leaderboard":
            return { top: generateLeaderboard() };

        case "/api/open_case": {
            const cost = CASE_COSTS[body.case_id];
            if (!cost) throw new Error("Неверный кейс");
            if (currentUser.balance < cost) throw new Error("Недостаточно монет");
            currentUser.balance -= cost;
            currentUser.total_wagered += cost;
            const rtp = getRtp(currentUser.cases_opened);
            const mIdx = pickMultiplierIndex();
            const m = MULTIPLIERS[mIdx];
            let reward = Math.floor(cost * m * rtp);
            reward = applyHappy(reward);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop(CASE_LABEL[body.case_id] || `Кейс ${cost}`, reward - cost, mIdx === MULTIPLIERS.length - 1);
            saveDemo();
            return {
                reward, cost, balance: currentUser.balance,
                multiplier: m, multiplier_index: mIdx,
                win: m >= 1.0, jackpot: mIdx === MULTIPLIERS.length - 1,
            };
        }

        case "/api/open_star_case": {
            const stars = body.stars;
            const cost = stars * 10;
            if (currentUser.balance < cost) throw new Error("Недостаточно монет");
            currentUser.balance -= cost;
            currentUser.total_wagered += cost;
            const rtp = getRtp(currentUser.cases_opened);
            const starTables = {
                1:[0,0.5,1.0,1.5,2.0,3.0], 3:[0,0.5,1.0,1.5,2.0,3.0],
                5:[0,0.7,1.0,1.5,2.0,3.5], 10:[0,0.7,1.0,1.5,2.0,4.0],
                25:[0,0.8,1.0,1.5,2.5,5.0], 50:[0,0.8,1.0,1.5,3.0,6.0],
                75:[0,0.8,1.0,1.5,3.0,8.0], 100:[0,1.0,1.2,1.5,3.0,10.0],
                250:[0,1.0,1.2,1.5,3.5,12.0], 500:[0,1.0,1.5,2.0,4.0,15.0],
            };
            const mults = starTables[stars] || starTables[10];
            const mIdx = pickMultiplierIndex();
            const m = mults[mIdx];
            let reward = Math.floor(cost * m * rtp);
            reward = applyHappy(reward);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop(`⭐ ${STAR_LABEL[stars] || stars + "⭐"}`, reward - cost, mIdx === MULTIPLIERS.length - 1);
            saveDemo();
            return {
                reward, cost, balance: currentUser.balance,
                multiplier: m, multiplier_index: mIdx,
                win: m >= 1.0, jackpot: mIdx === MULTIPLIERS.length - 1,
            };
        }

        case "/api/spin_wheel": {
            if (currentUser.balance < 10) throw new Error("Недостаточно монет");
            currentUser.balance -= 10;
            currentUser.total_wagered += 10;
            const prizes  = [0, 5, 10, 15, 20, 25, 30, 50];
            const weights = [25, 20, 18, 12, 10, 8, 5, 2];
            const total = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * total;
            let idx = 0;
            for (let i = 0; i < weights.length; i++) {
                if ((r -= weights[i]) <= 0) { idx = i; break; }
            }
            const reward = applyHappy(prizes[idx]);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop("Колесо фортуны", reward - 10, reward >= 30);
            saveDemo();
            return { index: idx, reward, cost: 10, balance: currentUser.balance, win: reward > 0 };
        }

        case "/api/roll_dice": {
            if (currentUser.balance < 10) throw new Error("Недостаточно монет");
            currentUser.balance -= 10;
            currentUser.total_wagered += 10;
            const d1 = 1 + Math.floor(Math.random() * 6);
            const d2 = 1 + Math.floor(Math.random() * 6);
            const sum = d1 + d2;
            const rewards = { 2:40, 3:15, 4:10, 5:8, 6:6, 7:30, 8:6, 9:8, 10:10, 11:15, 12:40 };
            const reward = applyHappy(rewards[sum] || 0);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop(`Кости ${d1}+${d2}`, reward - 10, sum === 2 || sum === 12);
            saveDemo();
            return { dice: [d1, d2], total: sum, reward, cost: 10, balance: currentUser.balance, win: reward >= 10 };
        }

        case "/api/saper/start": {
            const cost = body.cost || 25;
            if (currentUser.balance < cost) throw new Error("Недостаточно монет");
            currentUser.balance -= cost;
            currentUser.total_wagered += cost;
            saveDemo();
            return { cost, balance: currentUser.balance };
        }

        case "/api/saper/finish": {
            const cellsOpened = body.cells_opened || 0;
            const config = state.saperConfig || { cost: 25 };
            const reward = Math.floor(cellsOpened * (config.cost * 0.28));
            const finalReward = applyHappy(reward);
            currentUser.balance += finalReward;
            currentUser.cases_opened++;
            if (finalReward > currentUser.best_drop) currentUser.best_drop = finalReward;
            addDrop("Сапёр", finalReward - config.cost, finalReward > config.cost * 2);
            saveDemo();
            return { reward: finalReward, balance: currentUser.balance };
        }

        case "/api/daily": {
            const today = new Date().toISOString().slice(0, 10);
            if (currentUser.last_daily === today) throw new Error("Уже получено сегодня");
            const reward = [15, 20, 25, 30, 50][Math.floor(Math.random() * 5)];
            currentUser.balance += reward;
            currentUser.last_daily = today;
            saveDemo();
            return { reward, balance: currentUser.balance };
        }

        case "/api/support":
            return { ok: true, delivered: 1 };

        case "/api/invoice/coins": {
            currentUser.balance += body.coins;
            saveDemo();
            return { stars: Math.floor(body.coins / 10), coins: body.coins, demo: true };
        }

        case "/api/free_case": {
            const now = Date.now();
            const cooldown = 24 * 60 * 60 * 1000;
            if (now - (currentUser.last_free_case || 0) < cooldown) throw new Error("Ещё не готов");
            const reward = applyHappy(20 + Math.floor(Math.random() * 480));
            currentUser.balance += reward;
            currentUser.cases_opened++;
            currentUser.last_free_case = now;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop("Бесплатный кейс", reward, reward >= 300);
            saveDemo();
            return { reward, balance: currentUser.balance };
        }
    }
    throw new Error("Unknown endpoint: " + path);
}

/* ДРОПЫ */
function addDrop(label, delta, jackpot = false) {
    currentUser.drops.unshift({
        label, delta, jackpot, ts: Date.now(),
        user: currentUser.first_name || currentUser.username || "Ты",
        isMine: true,
    });
    if (currentUser.drops.length > 30) currentUser.drops.length = 30;
    renderDropsFeed();
}

const AMBIENT_NAMES = ["CryptoKing", "Lucky7", "Neon", "ZeroX", "MaxWin", "Flash", "Void", "Nova", "Titan",
                       "Ghost", "Ace", "Samurai", "Phantom", "Fury", "Blade", "Storm", "Venom", "Echo", "Frost", "Whale"];
const AMBIENT_CASES = ["Пыль", "Пепел", "Мелл", "Telega", "Оникс", "Бездна", "Колесо", "Кости", "Сапёр"];

let ambientDrops = [];

function seedAmbientDrops() {
    ambientDrops = [];
    const now = Date.now();
    for (let i = 0; i < 14; i++) {
        const name = AMBIENT_NAMES[i % AMBIENT_NAMES.length];
        const game = AMBIENT_CASES[(i * 7 + 3) % AMBIENT_CASES.length];
        const winRoll = (i * 73) % 100;
        const win = winRoll > 35;
        const delta = win ? 80 + ((i * 137) % 820) : -(30 + ((i * 53) % 180));
        ambientDrops.push({
            label: game, delta,
            jackpot: win && winRoll > 92,
            ts: now - i * 1000 * 60 * (2 + (i % 5)),
            user: name, isMine: false,
        });
    }
    ambientDrops.sort((a, b) => b.ts - a.ts);
}

function renderDropsFeed() {
    const box = document.getElementById("drops-feed");
    if (!box) return;
    const myDrops = (currentUser.drops || []).map(d => ({ ...d, isMine: true }));
    const merged = [...myDrops, ...ambientDrops].sort((a, b) => b.ts - a.ts).slice(0, 15);
    if (!merged.length) {
        box.innerHTML = `<div class="drop-row"><div class="drop-text">Пока пусто. Открой первый кейс!</div></div>`;
        return;
    }
    box.innerHTML = merged.map(d => {
        const cls = d.delta > 0 ? (d.jackpot ? "jackpot" : "win") : "lose";
        const sign = d.delta > 0 ? "+" : "";
        const prefix = d.isMine ? "⭐ " : "";
        return `<div class="drop-row">
            <div class="drop-icon">${d.jackpot ? "🌟" : d.delta > 0 ? "🎉" : "💔"}</div>
            <div class="drop-text">${prefix}<b>${escapeHtml(d.user)}</b> · ${escapeHtml(d.label)}</div>
            <div class="drop-value ${cls}">${sign}${d.delta.toLocaleString("ru-RU")} 🪙</div>
        </div>`;
    }).join("");
}

/* СПРАВОЧНИКИ */
const CASE_LABEL = {
    "10": "Кейс Пыль", "50": "Кейс Пепел", "250": "Кейс Мелл",
    "1000": "Кейс Telega", "5000": "Кейс Оникс", "10000": "Кейс Бездна",
};
const STAR_LABEL = {
    "1": "Фарм", "3": "Базовый", "5": "Лёгкий", "10": "Удача",
    "25": "Везучий", "50": "Подарки", "75": "Победа",
    "100": "Фортуна", "250": "Джекпот", "500": "NFT",
};

const COIN_CASES = [
    { id: "10",    name: "Пыль",    price: 10,    emoji: "📦" },
    { id: "50",    name: "Пепел",   price: 50,    emoji: "💼" },
    { id: "250",   name: "Мелл",    price: 250,   emoji: "🔥" },
    { id: "1000",  name: "Telega",  price: 1000,  emoji: "💎" },
    { id: "5000",  name: "Оникс",   price: 5000,  emoji: "👑" },
    { id: "10000", name: "Бездна",  price: 10000, emoji: "🌌" },
];
const STAR_CASES = [
    { id: "1",   name: "Фарм",    price: 1,   emoji: "🌱" },
    { id: "3",   name: "Базовый", price: 3,   emoji: "🎯" },
    { id: "5",   name: "Лёгкий",  price: 5,   emoji: "🎈" },
    { id: "10",  name: "Удача",   price: 10,  emoji: "🍀" },
    { id: "25",  name: "Везучий", price: 25,  emoji: "🎪" },
    { id: "50",  name: "Подарки", price: 50,  emoji: "🎁" },
    { id: "75",  name: "Победа",  price: 75,  emoji: "🏆" },
    { id: "100", name: "Фортуна", price: 100, emoji: "⭐" },
    { id: "250", name: "Джекпот", price: 250, emoji: "💥" },
    { id: "500", name: "NFT",     price: 500, emoji: "🪐" },
];

/* BOOTSTRAP */
function bootstrap() {
    if (DEMO) Object.assign(currentUser, loadDemo());

    const u = tg.initDataUnsafe?.user || {};
    currentUser.id = u.id || 0;
    currentUser.first_name = u.first_name || "";
    currentUser.last_name = u.last_name || "";
    currentUser.username = u.username || "";
    currentUser.avatar_url = u.photo_url || "";
    currentUser.rank = currentUser.rank || 1;
    currentUser.total_users = currentUser.total_users || 1;
    currentUser.ref_link = `https://t.me/${BOT_USERNAME}?start=${currentUser.id}`;

    try {
        buildCases();
        buildStarCases();
        buildCarouselDots();
        buildTopUpOptions();
        buildShopGrid();
        buildWheel();
        bindCarouselSwipe();
        bindSaperLevels();
        seedAmbientDrops();
        renderAll();
        startFreeCaseTimer();
        loadMusicPref();
    } catch (e) {
        console.error("Build error:", e);
        toast("Ошибка инициализации: " + e.message, "error", 5000);
    }

    document.getElementById("global-loader").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
}

function renderAll() {
    renderProfile();
    renderDropsFeed();
    renderLeaderboard();
    setBalance(currentUser.balance, false);
    renderMusicCard();
}

/* ПРОФИЛЬ / БАЛАНС */
function renderProfile() {
    const u = tg.initDataUnsafe?.user || {};

    const avatarEl = document.getElementById("profile-avatar");
    if (avatarEl) {
        if (currentUser.avatar_url) {
            avatarEl.src = currentUser.avatar_url;
            avatarEl.onerror = () => {
                avatarEl.src = makeInitialsAvatar(currentUser.first_name, currentUser.last_name, currentUser.username);
                avatarEl.onerror = null;
            };
        } else {
            avatarEl.src = makeInitialsAvatar(
                u.first_name || currentUser.first_name,
                u.last_name || currentUser.last_name,
                u.username || currentUser.username
            );
        }
    }

    const nameEl = document.getElementById("profile-name");
    if (nameEl) {
        nameEl.textContent = [u.first_name || currentUser.first_name, u.last_name || currentUser.last_name]
            .filter(Boolean).join(" ") || "Игрок";
    }

    const unEl = document.getElementById("profile-username");
    if (unEl) {
        const un = u.username || currentUser.username;
        unEl.textContent = un ? `@${un}` : `ID: ${currentUser.id}`;
    }

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText("profile-badge", `#${currentUser.rank} из ${currentUser.total_users}`);
    setText("profile-cases", currentUser.cases_opened);
    setText("profile-stars", currentUser.stars_spent);
    setText("profile-refs", currentUser.referrals);
    setText("ref-link", currentUser.ref_link || "—");
    setText("home-cases", currentUser.cases_opened);
    setText("home-wagered", formatNum(currentUser.total_wagered));
    setText("home-best", formatNum(currentUser.best_drop));

    const happy = document.getElementById("happy-banner");
    if (happy) happy.style.display = isHappyHours() ? "flex" : "none";
}

let balanceAnimFrame = null;

function animateBalance(from, to, duration = 700) {
    const el = document.getElementById("coins");
    const prof = document.getElementById("profile-balance");
    if (!el) return;
    if (balanceAnimFrame) cancelAnimationFrame(balanceAnimFrame);
    const start = performance.now();
    function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(from + (to - from) * eased);
        el.textContent = current.toLocaleString("ru-RU");
        if (prof) prof.textContent = current.toLocaleString("ru-RU");
        if (t < 1) balanceAnimFrame = requestAnimationFrame(tick);
        else balanceAnimFrame = null;
    }
    balanceAnimFrame = requestAnimationFrame(tick);
}

function setBalance(v, animate = true, fromValue = null) {
    const old = fromValue !== null ? fromValue : currentUser.balance;
    currentUser.balance = v;
    if (animate && old !== v) {
        animateBalance(old, v, 700);
        const pill = document.getElementById("balance-pill");
        if (pill) {
            pill.classList.add("bump");
            setTimeout(() => pill.classList.remove("bump"), 300);
        }
    } else {
        const el = document.getElementById("coins");
        if (el) el.textContent = v.toLocaleString("ru-RU");
        const prof = document.getElementById("profile-balance");
        if (prof) prof.textContent = v.toLocaleString("ru-RU");
    }
    saveDemo();
}

/* ЛИДЕРБОРД */
function generateLeaderboard() {
    const list = AMBIENT_NAMES.slice(0, 20).map((name) => {
        let seed = 0;
        for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
        const balance = 60_000 + (seed % 900_000);
        const cases = 100 + (seed % 900);
        return { username: name, balance, cases, isMine: false };
    });
    list.push({
        username: currentUser.first_name || currentUser.username || "Ты",
        balance: currentUser.balance,
        cases: currentUser.cases_opened,
        isMine: true,
    });
    list.sort((a, b) => b.balance - a.balance);
    list.forEach((u, i) => {
        u.rank = i + 1;
        if (u.isMine) {
            currentUser.rank = i + 1;
            currentUser.total_users = list.length;
        }
    });
    return list;
}

function renderLeaderboard() {
    const box = document.getElementById("leaderboard-list");
    if (!box) return;
    const top = generateLeaderboard();
    box.innerHTML = top.map(u => {
        const cls = u.rank === 1 ? "gold" : u.rank === 2 ? "silver" : u.rank === 3 ? "bronze" : "";
        return `<div class="leader-row ${u.isMine ? 'me' : ''}">
            <div class="leader-rank ${cls}">#${u.rank}</div>
            <div class="leader-name">${u.isMine ? '⭐ ' : ''}${escapeHtml(u.username)}</div>
            <div class="leader-balance">${u.balance.toLocaleString("ru-RU")} 🪙</div>
        </div>`;
    }).join("");
    const badge = document.getElementById("profile-badge");
    if (badge) badge.textContent = `#${currentUser.rank} из ${currentUser.total_users}`;
}

/* НАВИГАЦИЯ */
function switchTab(tabId) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    const el = document.getElementById(`tab-${tabId}`);
    if (el) el.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    if (tabId !== "games") closeGameView();
    haptic("light");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

/* ИГРЫ */
function openGame(gameId) {
    const menu = document.getElementById("games-menu");
    if (menu) menu.classList.add("hidden");
    document.querySelectorAll(".game-view").forEach(v => v.classList.add("hidden"));
    const view = document.getElementById(`game-${gameId}`);
    if (view) view.classList.remove("hidden");
    haptic("light");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function closeGameView() {
    document.querySelectorAll(".game-view").forEach(v => v.classList.add("hidden"));
    const menu = document.getElementById("games-menu");
    if (menu) menu.classList.remove("hidden");
    resetSaperState();
}

/* КАРУСЕЛЬ */
let currentSlide = 0;
let carouselTimer = null;

function buildCarouselDots() {
    const track = document.getElementById("carousel-track");
    if (!track) return;
    const n = track.children.length;
    const dots = document.getElementById("carousel-dots");
    if (!dots) return;
    dots.innerHTML = Array.from({ length: n }, (_, i) =>
        `<i class="${i === 0 ? 'active' : ''}"></i>`
    ).join("");
    startCarouselAuto();
}

function showSlide(i) {
    const track = document.getElementById("carousel-track");
    if (!track) return;
    const n = track.children.length;
    currentSlide = ((i % n) + n) % n;
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    document.querySelectorAll("#carousel-dots i").forEach((d, idx) =>
        d.classList.toggle("active", idx === currentSlide)
    );
}

function nextSlide() { showSlide(currentSlide + 1); startCarouselAuto(); }
function prevSlide() { showSlide(currentSlide - 1); startCarouselAuto(); }

function startCarouselAuto() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(() => showSlide(currentSlide + 1), 6500);
}

function bindCarouselSwipe() {
    const el = document.getElementById("carousel");
    if (!el) return;
    let startX = 0, startY = 0, dragging = false;
    const onStart = (e) => {
        const t = e.touches ? e.touches[0] : e;
        startX = t.clientX; startY = t.clientY;
        dragging = true;
        if (carouselTimer) clearInterval(carouselTimer);
    };
    const onEnd = (e) => {
        if (!dragging) return;
        dragging = false;
        const t = e.changedTouches ? e.changedTouches[0] : e;
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
            showSlide(dx > 0 ? currentSlide - 1 : currentSlide + 1);
            haptic("light");
        }
        startCarouselAuto();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("mousedown", onStart);
    el.addEventListener("mouseup", onEnd);
    el.addEventListener("mouseleave", () => { dragging = false; startCarouselAuto(); });
}

/* КЕЙСЫ */
function buildCases() {
    const grid = document.getElementById("cases-grid");
    if (!grid) return;
    grid.innerHTML = COIN_CASES.map(c => `
        <button class="case-btn" data-case="${c.id}">
            <div class="case-icon">${c.emoji}</div>
            <div class="case-name">${c.name}</div>
            <div class="case-price">${c.price.toLocaleString("ru-RU")} 🪙</div>
        </button>`).join("");
    grid.querySelectorAll(".case-btn").forEach(btn =>
        btn.addEventListener("click", () => openCase(btn.dataset.case))
    );
}

function buildStarCases() {
    const grid = document.getElementById("star-cases-grid");
    if (!grid) return;
    grid.innerHTML = STAR_CASES.map(c => `
        <button class="case-btn star" data-star="${c.id}">
            <div class="case-icon">${c.emoji}</div>
            <div class="case-name">${c.name}</div>
            <div class="case-price">${c.price} ⭐</div>
        </button>`).join("");
    grid.querySelectorAll(".case-btn").forEach(btn =>
        btn.addEventListener("click", () => openStarCase(btn.dataset.star))
    );
}

async function openCase(caseId) {
    if (state.caseOpening) return;
    const caseData = COIN_CASES.find(c => c.id === caseId);
    if (!caseData) return;
    if (currentUser.balance < caseData.price) {
        toast("Недостаточно монет", "error");
        hapticNotify("error");
        return;
    }
    await runCaseAnimation(
        `Кейс «${caseData.name}»`,
        () => apiCall("/api/open_case", { case_id: caseId })
    );
}

async function openStarCase(starId) {
    if (state.caseOpening) return;
    const caseData = STAR_CASES.find(c => c.id === starId);
    if (!caseData) return;
    if (DEMO) {
        const coinsPrice = caseData.price * 10;
        if (currentUser.balance < coinsPrice) {
            toast(`Нужно ${coinsPrice} 🪙 (демо-курс 1⭐ = 10🪙)`, "error");
            hapticNotify("error");
            return;
        }
        await runCaseAnimation(
            `⭐ «${caseData.name}» · ${caseData.price}⭐`,
            () => apiCall("/api/open_star_case", { stars: caseData.price })
        );
    } else {
        toast("Звёздные кейсы — в боте ⭐", "info");
    }
}

async function runCaseAnimation(title, apiFn) {
    if (state.caseOpening) return;
    state.caseOpening = true;
    haptic("medium");

    const modal = document.getElementById("case-modal");
    const reel = document.getElementById("case-reel");
    const titleEl = document.getElementById("case-modal-title");
    const resEl = document.getElementById("case-modal-result");
    const wrap = document.querySelector(".case-reel-wrap");

    if (titleEl) titleEl.textContent = title;
    if (resEl) resEl.innerHTML = "&nbsp;";

    reel.innerHTML = "";
    reel.style.transition = "none";
    reel.style.transform = "translateX(0)";

    const WINNER_INDEX = 50;
    const items = [];
    for (let i = 0; i < 60; i++) {
        items.push(MULT_TO_RARITY[Math.floor(Math.random() * MULT_TO_RARITY.length)]);
    }
    items[WINNER_INDEX] = { key: "rare", label: "...", emoji: "❓" };

    items.forEach((it) => {
        const div = document.createElement("div");
        div.className = `case-item r-${it.key}`;
        div.innerHTML = `${it.emoji}<small>${escapeHtml(it.label)}</small>`;
        reel.appendChild(div);
    });

    modal.classList.remove("hidden");

    let result = null, apiError = null;
    try { result = await apiFn(); }
    catch (e) { apiError = e; }

    if (apiError) {
        toast(apiError.message || "Ошибка", "error");
        modal.classList.add("hidden");
        state.caseOpening = false;
        return;
    }

    const winnerRarity = MULT_TO_RARITY[result.multiplier_index] || MULT_TO_RARITY[0];
    const winnerEl = reel.children[WINNER_INDEX];
    if (winnerEl) {
        winnerEl.className = `case-item r-${winnerRarity.key}`;
        winnerEl.innerHTML = `${winnerRarity.emoji}<small>${escapeHtml(winnerRarity.label)}</small>`;
    }

    await new Promise(r => setTimeout(r, 100));

    let wrapWidth = wrap.getBoundingClientRect().width;
    if (wrapWidth < 100) {
        wrapWidth = modal.querySelector(".case-modal-inner")?.getBoundingClientRect().width || 340;
    }

    const ITEM_WIDTH = 90 + 6;
    const targetX = -(WINNER_INDEX * ITEM_WIDTH + ITEM_WIDTH / 2 - wrapWidth / 2);
    const jitter = (Math.random() - 0.5) * (ITEM_WIDTH * 0.4);
    const finalX = targetX + jitter;

    void reel.offsetWidth;

    reel.style.transition = "transform 3.5s cubic-bezier(0.15, 0.9, 0.15, 1)";
    reel.style.transform = `translateX(${finalX}px)`;

    setTimeout(() => {
        if (!state.caseOpening) return;
        showCaseResult(result);
    }, 3600);
}

function showCaseResult(result) {
    if (!state.caseOpening) return;
    state.caseOpening = false;
    const modal = document.getElementById("case-modal");
    const resEl = document.getElementById("case-modal-result");
    if (!result) { modal.classList.add("hidden"); return; }

    const isJackpot = result.jackpot;
    if (result.win) {
        const profit = result.reward - result.cost;
        const profitColor = profit >= 0 ? "#22dd88" : "#ff3b5b";
        const profitSign = profit >= 0 ? "+" : "";
        resEl.innerHTML = `
            <span style="color:${isJackpot ? '#ff3b5b' : '#ffd700'};text-shadow:0 0 30px currentColor">
                ${isJackpot ? "🎉 JACKPOT!" : "🏆 ПОБЕДА!"}
            </span>
            <div style="margin-top:14px;font-size:20px;color:#fff">
                Выигрыш: <b>${result.reward.toLocaleString("ru-RU")}</b> 🪙
            </div>
            <div style="margin-top:6px;font-size:15px;color:${profitColor}">
                Чистыми: <b>${profitSign}${profit.toLocaleString("ru-RU")}</b> 🪙
            </div>`;
        hapticNotify("success");
    } else {
        resEl.innerHTML = `
            <span style="color:#ff3b5b;font-size:22px">💔 Проигрыш</span>
            <div style="margin-top:14px;font-size:15px;color:#ff3b5b">
                Чистыми: <b>-${result.cost.toLocaleString("ru-RU")}</b> 🪙
            </div>`;
        hapticNotify("error");
    }

    const balanceBefore = result.balance - result.reward + result.cost;
    setBalance(result.balance, true, balanceBefore);
    renderProfile();
    renderLeaderboard();

    setTimeout(() => { modal.classList.add("hidden"); }, 2200);
}

function forceCloseCase() {
    state.caseOpening = false;
    const modal = document.getElementById("case-modal");
    if (modal) modal.classList.add("hidden");
}

/* БЕСПЛАТНЫЙ КЕЙС */
let freeCaseTimerId = null;
const FREE_CASE_COOLDOWN = 24 * 60 * 60 * 1000;

function startFreeCaseTimer() {
    if (freeCaseTimerId) clearInterval(freeCaseTimerId);
    updateFreeCaseUI();
    freeCaseTimerId = setInterval(updateFreeCaseUI, 1000);
}

function updateFreeCaseUI() {
    const card = document.getElementById("free-case-card");
    const timer = document.getElementById("free-case-timer");
    if (!card || !timer) return;
    const diff = Date.now() - (currentUser.last_free_case || 0);
    if (diff >= FREE_CASE_COOLDOWN) {
        card.classList.remove("disabled");
        timer.textContent = "Готов к открытию!";
        timer.style.color = "var(--gold)";
    } else {
        card.classList.add("disabled");
        const left = FREE_CASE_COOLDOWN - diff;
        const h = Math.floor(left / 3_600_000);
        const m = Math.floor((left % 3_600_000) / 60_000);
        const s = Math.floor((left % 60_000) / 1000);
        timer.textContent = `Через ${h}ч ${String(m).padStart(2, "0")}м ${String(s).padStart(2, "0")}с`;
        timer.style.color = "var(--text-dim)";
    }
}

async function openFreeCase() {
    if (state.caseOpening) return;
    if (Date.now() - (currentUser.last_free_case || 0) < FREE_CASE_COOLDOWN) {
        toast("Ещё не готов", "error");
        return;
    }
    await runCaseAnimation("🎁 Бесплатный кейс", () => apiCall("/api/free_case"));
    renderProfile();
    renderLeaderboard();
}

/* КОЛЕСО */
const WHEEL_PRIZES = [0, 5, 10, 15, 20, 25, 30, 50];
let wheelRotation = 0;

function buildWheel() {
    const inner = document.getElementById("wheel-inner");
    if (!inner) return;
    inner.innerHTML = "";
    const total = WHEEL_PRIZES.length;
    const seg = 360 / total;
    WHEEL_PRIZES.forEach((prize, i) => {
        const label = document.createElement("div");
        label.className = "wheel-seg-label";
        const angle = i * seg + seg / 2;
        label.style.transform = `rotate(${angle - 90}deg) translate(90px, 0)`;
        label.textContent = prize === 0 ? "💀" : prize + "🪙";
        inner.appendChild(label);
    });
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

    const balanceBeforeSpin = currentUser.balance;
    setBalance(balanceBeforeSpin - 10, true, balanceBeforeSpin);

    let result;
    try { result = await apiCall("/api/spin_wheel"); }
    catch (e) {
        setBalance(balanceBeforeSpin, true, balanceBeforeSpin - 10);
        toast(e.message, "error");
        state.spinning = false;
        btn.disabled = false;
        return;
    }

    const seg = 360 / WHEEL_PRIZES.length;
    const normalizedCurrent = ((wheelRotation % 360) + 360) % 360;
    const targetIn360 = (360 - (result.index * seg + seg / 2)) % 360;
    const delta = (targetIn360 - normalizedCurrent + 360) % 360;
    wheelRotation += 360 * 5 + delta;

    wheelEl.style.transition = "transform 5s cubic-bezier(0.15, 0.9, 0.15, 1)";
    wheelEl.style.transform = `rotate(${wheelRotation}deg)`;

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
        setBalance(result.balance, true, balanceBeforeSpin - 10);
        renderProfile();
        renderLeaderboard();
        state.spinning = false;
        btn.disabled = false;
        wheelEl.style.transition = "none";
        wheelRotation = wheelRotation % 360;
        wheelEl.style.transform = `rotate(${wheelRotation}deg)`;
    }, 5100);
}

/* КОСТИ */
const DICE_ROTATIONS = {
    1: { x: 0,   y: 0   },
    2: { x: -90, y: 0   },
    3: { x: 0,   y: -90 },
    4: { x: 0,   y: 90  },
    5: { x: 90,  y: 0   },
    6: { x: 0,   y: 180 },
};

function setDiceToValue(diceEl, value, delay = 0) {
    const rot = DICE_ROTATIONS[value] || DICE_ROTATIONS[1];
    const spinsX = 3 + Math.floor(Math.random() * 3);
    const spinsY = 3 + Math.floor(Math.random() * 3);
    const extraX = 360 * spinsX;
    const extraY = 360 * spinsY;
    const extraZ = 90 * (Math.floor(Math.random() * 4) - 2);
    const duration = 1.8 + Math.random() * 0.6;
    diceEl.style.transition = `transform ${duration}s cubic-bezier(0.22, 0.85, 0.25, 1) ${delay}s`;
    diceEl.style.transform = `rotateX(${rot.x + extraX}deg) rotateY(${rot.y + extraY}deg) rotateZ(${extraZ}deg)`;
}

async function rollDice() {
    if (state.rolling) return;
    if (currentUser.balance < 10) { toast("Нужно 10 🪙", "error"); return; }
    state.rolling = true;
    haptic("medium");

    const d1el = document.getElementById("dice1");
    const d2el = document.getElementById("dice2");
    const resultEl = document.getElementById("dice-result");
    resultEl.textContent = "";
    resultEl.className = "game-result";

    const balanceBefore = currentUser.balance;

    let result;
    try { result = await apiCall("/api/roll_dice"); }
    catch (e) { toast(e.message, "error"); state.rolling = false; return; }

    d1el.style.transition = "none";
    d2el.style.transition = "none";
    d1el.style.transform = "rotateX(0) rotateY(0) rotateZ(0)";
    d2el.style.transform = "rotateX(0) rotateY(0) rotateZ(0)";
    void d1el.offsetWidth;
    void d2el.offsetWidth;

    setDiceToValue(d1el, result.dice[0], 0);
    setDiceToValue(d2el, result.dice[1], 0.12 + Math.random() * 0.15);

    setTimeout(() => {
        const e1 = ["⚀","⚁","⚂","⚃","⚄","⚅"][result.dice[0] - 1];
        const e2 = ["⚀","⚁","⚂","⚃","⚄","⚅"][result.dice[1] - 1];
        if (result.win) {
            resultEl.innerHTML = `🎲 ${e1} + ${e2} = <b>${result.total}</b> · <span style="color:#22dd88">+${result.reward} 🪙</span>`;
            resultEl.classList.add("win");
            hapticNotify("success");
        } else {
            resultEl.innerHTML = `🎲 ${e1} + ${e2} = <b>${result.total}</b> · <span style="color:#ff3b5b">проигрыш</span>`;
            resultEl.classList.add("lose");
            hapticNotify("error");
        }
        setBalance(result.balance, true, balanceBefore);
        renderProfile();
        renderLeaderboard();
        state.rolling = false;
    }, 2600);
}

/* САПЁР */
function bindSaperLevels() {
    document.querySelectorAll(".saper-level").forEach(btn => {
        btn.addEventListener("click", () => {
            state.saperConfig = {
                size: parseInt(btn.dataset.size),
                mines: parseInt(btn.dataset.mines),
                cost: parseInt(btn.dataset.cost),
                mult: parseFloat(btn.dataset.mult) || 2.0,
            };
            startSaperGame();
        });
    });
}

async function startSaperGame() {
    const cfg = state.saperConfig;
    if (!cfg) return;
    if (currentUser.balance < cfg.cost) {
        toast(`Нужно ${cfg.cost} 🪙`, "error");
        return;
    }
    if (DEMO) {
        currentUser.balance -= cfg.cost;
        currentUser.total_wagered += cfg.cost;
        setBalance(currentUser.balance, true, currentUser.balance + cfg.cost);
        saveDemo();
    } else {
        try { await apiCall("/api/saper/start", { cost: cfg.cost }); }
        catch (e) { toast(e.message, "error"); return; }
    }
    haptic("medium");

    document.getElementById("saper-setup").classList.add("hidden");
    document.getElementById("saper-play").classList.remove("hidden");
    document.getElementById("saper-cashout").style.display = "none";

    const grid = document.getElementById("saper-grid");
    grid.style.gridTemplateColumns = `repeat(${cfg.size}, 1fr)`;
    grid.innerHTML = "";
    document.getElementById("saper-info").textContent =
        `${cfg.size}×${cfg.size} · ${cfg.mines} мин · ставка ${cfg.cost} 🪙`;
    const resEl = document.getElementById("saper-result");
    resEl.textContent = "";
    resEl.className = "game-result";

    const total = cfg.size * cfg.size;
    const mines = new Set();
    while (mines.size < cfg.mines) mines.add(Math.floor(Math.random() * total));

    const totalSafe = total - cfg.mines;
    state.saperActive = true;
    state.saperSafe = 0;
    state.saperTotal = totalSafe;

    for (let i = 0; i < total; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.addEventListener("click", () => handleSaperClick(cell, mines.has(i), i, mines));
        grid.appendChild(cell);
    }
}

function updateCashoutButton() {
    const btn = document.getElementById("saper-cashout");
    const valEl = document.getElementById("saper-cashout-value");
    if (!btn || !valEl) return;
    const cfg = state.saperConfig;
    if (!cfg || state.saperSafe === 0) { btn.style.display = "none"; return; }
    const currentReward = Math.floor(state.saperSafe * (cfg.cost * 0.28));
    btn.style.display = "block";
    valEl.textContent = currentReward.toLocaleString("ru-RU");
}

async function handleSaperClick(cell, isMine, index, mines) {
    if (!state.saperActive) return;
    if (cell.classList.contains("opened") || cell.classList.contains("mine")) return;
    if (isMine) {
        cell.textContent = "💣";
        cell.classList.add("mine");
        hapticNotify("error");
        document.querySelectorAll("#saper-grid .cell").forEach((c, idx) => {
            if (mines.has(idx) && c !== cell) {
                c.textContent = "💣";
                c.classList.add("mine");
            }
        });
        await finishSaper();
    } else {
        cell.textContent = "✅";
        cell.classList.add("opened");
        state.saperSafe++;
        haptic("light");
        updateCashoutButton();
        if (state.saperSafe >= state.saperTotal) await saperCashOut();
    }
}

async function saperCashOut() {
    if (!state.saperActive || state.saperSafe === 0) return;
    state.saperActive = false;
    await finishSaper();
}

async function finishSaper() {
    const cellsOpened = state.saperSafe;
    let result;
    try {
        if (DEMO) {
            const cfg = state.saperConfig;
            const reward = Math.floor(cellsOpened * (cfg.cost * 0.28));
            const finalReward = applyHappy(reward);
            currentUser.balance += finalReward;
            currentUser.cases_opened++;
            if (finalReward > currentUser.best_drop) currentUser.best_drop = finalReward;
            addDrop("Сапёр", finalReward - cfg.cost, finalReward > cfg.cost * 2);
            saveDemo();
            result = { reward: finalReward, balance: currentUser.balance };
        } else {
            result = await apiCall("/api/saper/finish", { cells_opened: cellsOpened });
        }
    } catch (e) { toast(e.message, "error"); return; }

    const el = document.getElementById("saper-result");
    if (result.reward > 0) {
        el.innerHTML = `<span style="color:#22dd88">✅ +${result.reward} 🪙 (${cellsOpened} клеток)</span>`;
        el.classList.add("win");
        hapticNotify("success");
    } else {
        el.innerHTML = `<span style="color:#ff3b5b">💥 Пусто</span>`;
        el.classList.add("lose");
    }
    setBalance(result.balance, true, result.balance - result.reward);
    renderProfile();
    renderLeaderboard();
    document.getElementById("saper-cashout").style.display = "none";
    state.saperActive = false;
}

function resetSaperState() {
    state.saperActive = false;
    state.saperSafe = 0;
    state.saperConfig = null;
    const setup = document.getElementById("saper-setup");
    const play = document.getElementById("saper-play");
    if (setup) setup.classList.remove("hidden");
    if (play) play.classList.add("hidden");
    const grid = document.getElementById("saper-grid");
    if (grid) grid.innerHTML = "";
    const res = document.getElementById("saper-result");
    if (res) { res.textContent = ""; res.className = "game-result"; }
    const btn = document.getElementById("saper-cashout");
    if (btn) btn.style.display = "none";
}

/* МАГАЗИН */
const TOPUP_OPTIONS = [
    { coins: 100,   stars: 10,   cls: "",        badge: null },
    { coins: 250,   stars: 25,   cls: "",        badge: "Популярный", badgeCls: "popular" },
    { coins: 500,   stars: 50,   cls: "",        badge: null },
    { coins: 1000,  stars: 100,  cls: "gold",    badge: "Хит",       badgeCls: "hit" },
    { coins: 2500,  stars: 250,  cls: "",        badge: null },
    { coins: 5000,  stars: 500,  cls: "gold",    badge: "Выгодно",   badgeCls: "best" },
    { coins: 10000, stars: 1000, cls: "epic",    badge: "Про",       badgeCls: "hit" },
    { coins: 25000, stars: 2500, cls: "mega",    badge: "MEGA",      badgeCls: "best" },
];

function buildTopUpOptions() {
    const box = document.getElementById("topup-options");
    if (!box) return;
    box.innerHTML = TOPUP_OPTIONS.map(o =>
        `<button onclick="buyCoins(${o.coins})">${o.coins} 🪙 · ${o.stars} ⭐</button>`
    ).join("");
}

function buildShopGrid() {
    const grid = document.getElementById("shop-grid");
    if (!grid) return;
    let html = "";
    TOPUP_OPTIONS.forEach(o => {
        if (o.cls === "mega") {
            html += `
                <button class="shop-card ${o.cls}" onclick="buyCoins(${o.coins})">
                    ${o.badge ? `<div class="shop-badge ${o.badgeCls}">${o.badge}</div>` : ""}
                    <div class="shop-coin">💎</div>
                    <div class="shop-info">
                        <div class="shop-amount">${o.coins.toLocaleString("ru-RU")} монет</div>
                        <div class="shop-price">${o.stars} ⭐</div>
                    </div>
                </button>`;
        } else {
            html += `
                <button class="shop-card ${o.cls}" onclick="buyCoins(${o.coins})">
                    ${o.badge ? `<div class="shop-badge ${o.badgeCls}">${o.badge}</div>` : ""}
                    <div class="shop-coin">🪙</div>
                    <div class="shop-amount">${o.coins.toLocaleString("ru-RU")}</div>
                    <div class="shop-price">${o.stars} ⭐</div>
                </button>`;
        }
    });
    html += `
        <button class="shop-card gold" onclick="openCustomTopUp()">
            <div class="shop-coin">✨</div>
            <div class="shop-amount">Своя сумма</div>
            <div class="shop-price">от 100 🪙</div>
        </button>`;
    grid.innerHTML = html;
}

async function buyCoins(coins) {
    haptic("medium");
    const before = currentUser.balance;
    try {
        const data = await apiCall("/api/invoice/coins", { coins });
        if (DEMO) {
            setBalance(currentUser.balance, true, before);
            renderProfile();
            renderLeaderboard();
            toast(`🧪 Демо: +${coins} 🪙`, "success", 3000);
            closeModal("topup-modal");
            return;
        }
        if (tg.openInvoice) {
            tg.openInvoice(data.invoice_link, (status) => {
                if (status === "paid") {
                    toast("✅ Оплата прошла! Монеты зачислены", "success", 3500);
                    hapticNotify("success");
                    apiCall("/api/me").then(me => {
                        Object.assign(currentUser, me);
                        renderAll();
                    });
                } else if (status === "failed") {
                    toast("Оплата не прошла", "error");
                }
            });
        } else {
            tg.openLink(data.invoice_link);
        }
        closeModal("topup-modal");
    } catch (e) { toast(e.message, "error"); }
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
function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
}

/* ПОДДЕРЖКА */
let selectedTopic = "Вопрос";

function selectTopic(btn) {
    document.querySelectorAll(".support-topic").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTopic = btn.dataset.topic;
}

function openSupport() {
    document.getElementById("support-modal").classList.remove("hidden");
}

async function submitSupport() {
    const text = document.getElementById("support-text").value.trim();
    if (!text) { toast("Введите текст", "error"); return; }
    try {
        await apiCall("/api/support", { topic: selectedTopic, text });
        toast("✅ Отправлено", "success");
        document.getElementById("support-text").value = "";
        closeModal("support-modal");
    } catch (e) { toast(e.message, "error"); }
}

/* DAILY / REF */
async function claimDaily() {
    const btn = document.getElementById("daily-btn");
    btn.disabled = true;
    const before = currentUser.balance;
    try {
        const r = await apiCall("/api/daily");
        setBalance(r.balance, true, before);
        renderProfile();
        renderLeaderboard();
        toast(`🎁 Ежедневный бонус: +${r.reward} 🪙`, "success", 3500);
        hapticNotify("success");
    } catch (e) {
        toast(e.message, "error");
        btn.disabled = false;
    }
}

function copyRef() {
    const link = document.getElementById("ref-link").textContent;
    navigator.clipboard.writeText(link)
        .then(() => toast("📋 Ссылка скопирована", "success"))
        .catch(() => toast("Не удалось скопировать", "error"));
}

/* МУЗЫКА */
const MUSIC_TRACKS = [
    { id: "t1", name: "🌃 Neon Dreams",     url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "t2", name: "🚗 Midnight Drive",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: "t3", name: "⚡ Cyber Pulse",      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: "t4", name: "🌅 Golden Sunset",   url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { id: "t5", name: "🌌 Deep Space",      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
    { id: "t6", name: "💎 Lifeless Theme",  url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3" },
];

let musicAudio = null;
let currentTrackId = null;
let musicPlaying = false;

function loadMusicPref() {
    try {
        const saved = localStorage.getItem(`lifeless_music_${TG_USER_ID}`);
        if (saved && MUSIC_TRACKS.some(t => t.id === saved)) currentTrackId = saved;
    } catch (_) {}
    if (!currentTrackId) currentTrackId = MUSIC_TRACKS[0].id;
    renderMusicCard();
}

function renderMusicCard() {
    const titleEl = document.getElementById("music-current-title");
    const btnEl = document.getElementById("music-play-btn");
    if (!titleEl || !btnEl) return;
    const track = MUSIC_TRACKS.find(t => t.id === currentTrackId) || MUSIC_TRACKS[0];
    titleEl.textContent = track.name;
    btnEl.textContent = musicPlaying ? "⏸" : "▶";
}

function toggleMusic() {
    const track = MUSIC_TRACKS.find(t => t.id === currentTrackId);
    if (!track) return;
    if (!musicAudio) {
        musicAudio = new Audio();
        musicAudio.loop = true;
        musicAudio.volume = 0.5;
    }
    if (musicPlaying) {
        musicAudio.pause();
        musicPlaying = false;
    } else {
        if (musicAudio.src !== track.url) musicAudio.src = track.url;
        musicAudio.play().catch(() => {
            toast("Не удалось воспроизвести", "error");
            musicPlaying = false;
        });
        musicPlaying = true;
    }
    renderMusicCard();
    haptic("light");
}

function openMusicPicker() {
    const box = document.getElementById("music-list");
    if (!box) return;
    box.innerHTML = MUSIC_TRACKS.map(t => `
        <button class="music-item ${t.id === currentTrackId ? 'active' : ''}" onclick="selectMusic('${t.id}')">
            <span>🎵</span>
            <span class="music-item-name">${t.name}</span>
            ${t.id === currentTrackId ? '<span class="music-item-check">✓</span>' : ''}
        </button>
    `).join("");
    document.getElementById("music-modal").classList.remove("hidden");
    haptic("light");
}

function selectMusic(id) {
    currentTrackId = id;
    try { localStorage.setItem(`lifeless_music_${TG_USER_ID}`, id); } catch (_) {}
    if (musicAudio) {
        musicAudio.pause();
        musicPlaying = false;
    }
    renderMusicCard();
    closeModal("music-modal");
    toast("🎵 Трек сохранён", "success");
    haptic("light");
}

/* СТАРТ */
if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootstrap);
} else {
    bootstrap();
}