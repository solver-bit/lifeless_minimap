/* ============================================================
   LIFELESS SHOP · WebApp Logic
   Демо-режим: FORCE_DEMO = true — всё работает локально.
   Продакшн:   FORCE_DEMO = false — подключается к /api/*.
   ============================================================ */

// ⚠️ Пока нет сервера — принудительно демо. После деплоя → false
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

// ============================================================
//                    STATE
// ============================================================
const defaultUser = {
    id: 0, first_name: "", last_name: "", username: "", avatar_url: "",
    balance: 0, cases_opened: 0, referrals: 0, stars_spent: 0,
    total_wagered: 0, best_drop: 0, drops: [], rank: 1, total_users: 1,
    ref_link: "", last_free_case: 0, last_daily: "",
};

let currentUser = { ...defaultUser };
const state = {
    spinning: false,
    rolling: false,
    caseOpening: false,
    saperActive: false,
    saperSafe: 0,
    saperTotal: 0,
    saperConfig: null,
};

// ============================================================
//                    УТИЛИТЫ
// ============================================================
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

// SVG-аватар с инициалами (data URI) — если нет реальной аватарки
function makeInitialsAvatar(firstName, lastName, username) {
    let letters = "";
    if (firstName) letters += firstName.charAt(0);
    if (lastName) letters += lastName.charAt(0);
    if (!letters) letters = (username || "?").charAt(0);
    letters = letters.toUpperCase();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#00aaff"/>
                <stop offset="50%" stop-color="#c04cff"/>
                <stop offset="100%" stop-color="#ffd700"/>
            </linearGradient>
        </defs>
        <rect width="200" height="200" fill="#06060f"/>
        <circle cx="100" cy="100" r="90" fill="url(#g)" opacity="0.9"/>
        <text x="100" y="100" font-family="-apple-system,sans-serif" font-size="90"
              font-weight="900" fill="#06060f" text-anchor="middle" dominant-baseline="central">
            ${escapeHtml(letters)}
        </text>
    </svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// ============================================================
//                    DEMO DB (localStorage)
// ============================================================
const LS_KEY = "lifeless_demo_v3";

function loadDemo() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { ...defaultUser, ...parsed };
        }
    } catch (_) {}
    return { ...defaultUser, balance: 50000 };
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

// ============================================================
//                    ЭКОНОМИКА / ШАНСЫ
// ============================================================
const CASE_COSTS = { "10": 10, "50": 50, "250": 250, "1000": 1000, "5000": 5000, "10000": 10000 };

// Множитель: индекс и вес
const MULTIPLIERS = [0.0, 0.5, 1.0, 1.5, 2.0, 4.0];
const MULT_WEIGHTS = [40, 20, 20, 12, 6, 2];

// Рарити по индексу множителя — какое "качество" показать игроку
const MULT_TO_RARITY = [
    { key: "common",    label: "Пусто",     emoji: "💨" }, // x0
    { key: "common",    label: "Обычный",   emoji: "📦" }, // x0.5
    { key: "uncommon",  label: "Хороший",   emoji: "✨" }, // x1.0
    { key: "rare",      label: "Редкий",    emoji: "💎" }, // x1.5
    { key: "epic",      label: "Эпик",      emoji: "🔥" }, // x2.0
    { key: "legendary", label: "ЛЕГЕНДА",   emoji: "👑" }, // x4.0
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

// ============================================================
//                    API WRAPPER
// ============================================================
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

// ============================================================
//                    ЛОКАЛЬНЫЙ API (DEMO)
// ============================================================
async function demoApi(path, body) {
    // имитация задержки сети — но меньше, чтобы не лагало
    await new Promise(r => setTimeout(r, 80));

    switch (path) {
        case "/api/me":
            return {
                id: currentUser.id,
                first_name: currentUser.first_name,
                last_name: currentUser.last_name,
                username: currentUser.username,
                avatar_url: currentUser.avatar_url,
                balance: currentUser.balance,
                cases_opened: currentUser.cases_opened,
                referrals: currentUser.referrals,
                stars_spent: currentUser.stars_spent,
                rank: currentUser.rank,
                total_users: currentUser.total_users,
                ref_link: currentUser.ref_link,
                is_admin: true,
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

            const label = CASE_LABEL[body.case_id] || `Кейс ${cost}`;
            const delta = reward - cost;
            addDrop(label, delta, mIdx === MULTIPLIERS.length - 1);

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

            // Таблицы множителей под звёздные кейсы
            const starTables = {
                1:   [0, 0.5, 1.0, 1.5, 2.0, 3.0],
                3:   [0, 0.5, 1.0, 1.5, 2.0, 3.0],
                5:   [0, 0.7, 1.0, 1.5, 2.0, 3.5],
                10:  [0, 0.7, 1.0, 1.5, 2.0, 4.0],
                25:  [0, 0.8, 1.0, 1.5, 2.5, 5.0],
                50:  [0, 0.8, 1.0, 1.5, 3.0, 6.0],
                75:  [0, 0.8, 1.0, 1.5, 3.0, 8.0],
                100: [0, 1.0, 1.2, 1.5, 3.0, 10.0],
                250: [0, 1.0, 1.2, 1.5, 3.5, 12.0],
                500: [0, 1.0, 1.5, 2.0, 4.0, 15.0],
            };
            const mults = starTables[stars] || starTables[10];

            const mIdx = pickMultiplierIndex();
            const m = mults[mIdx];

            let reward = Math.floor(cost * m * rtp);
            reward = applyHappy(reward);
            currentUser.balance += reward;
            currentUser.cases_opened++;

            if (reward > currentUser.best_drop) currentUser.best_drop = reward;

            const label = `⭐ ${STAR_LABEL[stars] || stars + "⭐"}`;
            addDrop(label, reward - cost, mIdx === MULTIPLIERS.length - 1);
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

            // Таблица выплат на сумму двух кубиков
            const rewards = {
                2: 40, 3: 15, 4: 10, 5: 8, 6: 6,
                7: 30, 8: 6, 9: 8, 10: 10, 11: 15, 12: 40,
            };
            const reward = applyHappy(rewards[sum] || 0);
            currentUser.balance += reward;
            currentUser.cases_opened++;

            if (reward > currentUser.best_drop) currentUser.best_drop = reward;

            addDrop(`Кости ${d1}+${d2}`, reward - 10, sum === 2 || sum === 12);
            saveDemo();

            return {
                dice: [d1, d2], total: sum, reward, cost: 10,
                balance: currentUser.balance, win: reward >= 10,
            };
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
            // Теперь считаем на основе кол-ва открытых клеток и множителя
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
            const cooldown = 24 * 60 * 60 * 1000; // 24 часа
            if (now - (currentUser.last_free_case || 0) < cooldown) throw new Error("Ещё не готов");

            const reward = applyHappy(20 + Math.floor(Math.random() * 480)); // 20–500
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

// ============================================================
//                    ЛЕНТА ДРОПОВ
// ============================================================
function addDrop(label, delta, jackpot = false) {
    const row = {
        label,
        delta,
        jackpot,
        ts: Date.now(),
        user: currentUser.first_name || currentUser.username || "Ты",
        isMine: true,
    };
    currentUser.drops.unshift(row);
    if (currentUser.drops.length > 30) currentUser.drops.length = 30;
    renderDropsFeed();
}

// Амбиент-лента (фейковые игроки) — для оживления главной
const AMBIENT_NAMES = ["CryptoKing", "Lucky7", "Neon", "ZeroX", "MaxWin", "Flash", "Void", "Nova", "Titan",
                       "Ghost", "Ace", "Samurai", "Phantom", "Fury", "Blade", "Storm", "Venom", "Echo", "Frost", "Whale"];
const AMBIENT_CASES = ["Пыль", "Пепел", "Мелл", "Telega", "Оникс", "Бездна", "Колесо", "Кости", "Сапёр"];

let ambientDrops = [];

function seedAmbientDrops() {
    ambientDrops = [];
    const now = Date.now();
    for (let i = 0; i < 12; i++) {
        const name = AMBIENT_NAMES[Math.floor(Math.random() * AMBIENT_NAMES.length)];
        const game = AMBIENT_CASES[Math.floor(Math.random() * AMBIENT_CASES.length)];
        const win = Math.random() > 0.35;
        const delta = win
            ? Math.floor(50 + Math.random() * 800)
            : -Math.floor(10 + Math.random() * 200);
        ambientDrops.push({
            label: game,
            delta,
            jackpot: win && Math.random() > 0.9,
            ts: now - i * 1000 * 60 * (1 + Math.random() * 5),
            user: name,
            isMine: false,
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
        return `
            <div class="drop-row">
                <div class="drop-icon">${d.jackpot ? "🌟" : d.delta > 0 ? "🎉" : "💔"}</div>
                <div class="drop-text">${prefix}<b>${escapeHtml(d.user)}</b> · ${escapeHtml(d.label)}</div>
                <div class="drop-value ${cls}">${sign}${d.delta.toLocaleString("ru-RU")} 🪙</div>
            </div>`;
    }).join("");
}

// ============================================================
//                    СПРАВОЧНИКИ
// ============================================================
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

// ============================================================
//                    BOOTSTRAP
// ============================================================
function bootstrap() {
    // Подгружаем локальное состояние (в demo)
    if (DEMO) {
        Object.assign(currentUser, loadDemo());
    }

    // Данные из Telegram
    const u = tg.initDataUnsafe?.user || {};
    currentUser.id = currentUser.id || u.id || 1;
    currentUser.first_name = currentUser.first_name || u.first_name || "Игрок";
    currentUser.last_name = currentUser.last_name || u.last_name || "";
    currentUser.username = currentUser.username || u.username || "demo_user";
    currentUser.avatar_url = currentUser.avatar_url || u.photo_url || "";
    currentUser.rank = currentUser.rank || 4;
    currentUser.total_users = currentUser.total_users || 20;
    currentUser.ref_link = currentUser.ref_link || `https://t.me/demo_bot?start=${currentUser.id}`;

    // Первичная отрисовка
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
}

// ============================================================
//                    ПРОФИЛЬ / БАЛАНС
// ============================================================
function renderProfile() {
    const u = tg.initDataUnsafe?.user || {};

    // Аватарка
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
        const displayName = [u.first_name || currentUser.first_name, u.last_name || currentUser.last_name]
            .filter(Boolean).join(" ") || "Игрок";
        nameEl.textContent = displayName;
    }

    const unEl = document.getElementById("profile-username");
    if (unEl) {
        const un = u.username || currentUser.username;
        unEl.textContent = un ? `@${un}` : `ID: ${currentUser.id}`;
    }

    const setText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setText("profile-badge", `#${currentUser.rank} из ${currentUser.total_users}`);
    setText("profile-cases", currentUser.cases_opened);
    setText("profile-stars", currentUser.stars_spent);
    setText("profile-refs", currentUser.referrals);
    setText("ref-link", currentUser.ref_link || "—");

    setText("home-cases", currentUser.cases_opened);
    setText("home-wagered", formatNum(currentUser.total_wagered));
    setText("home-best", formatNum(currentUser.best_drop));

    // Счастливые часы
    const happy = document.getElementById("happy-banner");
    if (happy) happy.style.display = isHappyHours() ? "flex" : "none";
}

function setBalance(v, animate = true) {
    currentUser.balance = v;
    const coinsEl = document.getElementById("coins");
    if (coinsEl) coinsEl.textContent = v.toLocaleString("ru-RU");
    const prof = document.getElementById("profile-balance");
    if (prof) prof.textContent = v.toLocaleString("ru-RU");

    if (animate) {
        const pill = document.getElementById("balance-pill");
        if (pill) {
            pill.classList.add("bump");
            setTimeout(() => pill.classList.remove("bump"), 300);
        }
    }
    saveDemo();
}

// ============================================================
//                    ЛИДЕРБОРД
// ============================================================
function generateLeaderboard() {
    const names = AMBIENT_NAMES.slice(0, 20);
    const list = names.map((n, i) => ({
        username: n,
        balance: Math.floor(1_000_000 / (i + 1) + Math.random() * 50_000),
        cases: Math.floor(100 + Math.random() * 900),
        isMine: false,
    }));
    list.push({
        username: currentUser.first_name || currentUser.username || "Ты",
        balance: currentUser.balance,
        cases: currentUser.cases_opened,
        isMine: true,
    });
    list.sort((a, b) => b.balance - a.balance);
    list.forEach((u, i) => u.rank = i + 1);
    return list;
}

function renderLeaderboard() {
    const box = document.getElementById("leaderboard-list");
    if (!box) return;

    const top = generateLeaderboard();
    box.innerHTML = top.map(u => {
        const cls = u.rank === 1 ? "gold" : u.rank === 2 ? "silver" : u.rank === 3 ? "bronze" : "";
        return `
            <div class="leader-row ${u.isMine ? 'me' : ''}">
                <div class="leader-rank ${cls}">#${u.rank}</div>
                <div class="leader-name">${u.isMine ? '⭐ ' : ''}${escapeHtml(u.username)}</div>
                <div class="leader-balance">${u.balance.toLocaleString("ru-RU")} 🪙</div>
            </div>`;
    }).join("");
}

// ============================================================
//                    НАВИГАЦИЯ
// ============================================================
function switchTab(tabId) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    const el = document.getElementById(`tab-${tabId}`);
    if (el) el.classList.add("active");

    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.tab === tabId);
    });

    // Если вкладка не games — закрываем игровые виды
    if (tabId !== "games") closeGameView();

    haptic("light");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        switchTab(btn.dataset.tab);
    });
});

// ============================================================
//                    ИГРЫ
// ============================================================
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

// ============================================================
//                    КАРУСЕЛЬ
// ============================================================
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

// ============================================================
//                    КЕЙСЫ
// ============================================================
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
    state.caseOpening = true;
    haptic("medium");

    // СНАЧАЛА получаем результат от "сервера" — потом рисуем анимацию
    let result;
    try {
        result = await apiFn();
    } catch (e) {
        toast(e.message, "error");
        state.caseOpening = false;
        return;
    }

    const WINNER_INDEX = 50;
    const reel = document.getElementById("case-reel");
    const titleEl = document.getElementById("case-modal-title");
    if (titleEl) titleEl.textContent = title;

    reel.innerHTML = "";
    reel.style.transition = "none";
    reel.style.transform = "translateX(0)";

    // Лента из рандомных предметов, победитель — ровно под маркером
    const items = [];
    for (let i = 0; i < 60; i++) {
        items.push(MULT_TO_RARITY[Math.floor(Math.random() * MULT_TO_RARITY.length)]);
    }
    const winnerRarity = MULT_TO_RARITY[result.multiplier_index] || MULT_TO_RARITY[0];
    items[WINNER_INDEX] = winnerRarity;

    items.forEach((it) => {
        const div = document.createElement("div");
        div.className = `case-item r-${it.key}`;
        div.innerHTML = `${it.emoji}<small>${escapeHtml(it.label)}</small>`;
        reel.appendChild(div);
    });

    document.getElementById("case-modal").classList.remove("hidden");
    document.getElementById("case-modal-result").innerHTML = "&nbsp;";

    const wrap = document.querySelector(".case-reel-wrap");
    const wrapWidth = wrap.clientWidth;
    const itemWidth = 110 + 8; // width + gap
    const targetX = -(WINNER_INDEX * itemWidth + itemWidth / 2 - wrapWidth / 2);
    const jitter = (Math.random() - 0.5) * (itemWidth * 0.5);
    const finalX = targetX + jitter;

    // Кадр паузы, чтобы transition сработал
    await new Promise(r => requestAnimationFrame(() => setTimeout(r, 40)));

    reel.style.transition = "transform 5.5s cubic-bezier(0.12, 0.9, 0.15, 1)";
    reel.style.transform = `translateX(${finalX}px)`;

    // Показываем результат через 5.5с
    setTimeout(() => {
        const resEl = document.getElementById("case-modal-result");
        const isJackpot = result.jackpot;
        if (result.win) {
            resEl.innerHTML = `
                <span style="color:${isJackpot ? '#ff3b5b' : '#ffd700'};text-shadow:0 0 30px currentColor">
                    ${isJackpot ? "🎉 JACKPOT!" : "🏆 ПОБЕДА!"}<br>
                    +${result.reward.toLocaleString("ru-RU")} 🪙
                </span>`;
            hapticNotify("success");
        } else {
            resEl.innerHTML = `<span style="color:#ff3b5b">💔 Проигрыш · 0 🪙</span>`;
            hapticNotify("error");
        }

        setBalance(result.balance);
        renderProfile();
        renderLeaderboard();

        setTimeout(() => {
            document.getElementById("case-modal").classList.add("hidden");
            state.caseOpening = false;
        }, 2400);
    }, 5600);
}

// ============================================================
//                    БЕСПЛАТНЫЙ КЕЙС
// ============================================================
let freeCaseTimerId = null;
const FREE_CASE_COOLDOWN = 24 * 60 * 60 * 1000; // 24 часа

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

// ============================================================
//                    КОЛЕСО
// ============================================================
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
        label.style.transform = `rotate(${angle}deg) translate(90px, 0)`;
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

    let result;
    try { result = await apiCall("/api/spin_wheel"); }
    catch (e) { toast(e.message, "error"); state.spinning = false; btn.disabled = false; return; }

    // Вычисляем угол так, чтобы нужный сегмент встал под указателем
    const seg = 360 / WHEEL_PRIZES.length;
    const targetAngle = wheelRotation + 360 * 5 + (360 - (result.index * seg + seg / 2));
    wheelRotation = targetAngle;
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
        setBalance(result.balance);
        renderProfile();
        renderLeaderboard();
        state.spinning = false;
        btn.disabled = false;
    }, 5100);
}

// ============================================================
//                    КОСТИ (2 куба, 3D)
// ============================================================
// Карта: значение → (поворот кубика) + (эмодзи на гранях)
// Ориентируем грань так, чтобы её центр смотрел на зрителя.
const DICE_ROTATIONS = {
    1: { x: 0,   y: 0   }, // front  – ⚀
    2: { x: 90,  y: 0   }, // bottom – ⚁  (поворачиваем так, чтобы bottom оказался спереди)
    3: { x: 0,   y: -90 }, // right  – ⚂
    4: { x: 0,   y: 90  }, // left   – ⚃
    5: { x: -90, y: 0   }, // top    – ⚄
    6: { x: 0,   y: 180 }, // back   – ⚅
};

const DICE_FACE_EMOJI = {
    front:  "⚀", // 1
    bottom: "⚁", // 2
    right:  "⚂", // 3
    left:  "⚃", // 4
    top:    "⚄", // 5
    back:   "⚅", // 6
};

function setDiceToValue(diceEl, value) {
    const rot = DICE_ROTATIONS[value] || DICE_ROTATIONS[1];
    const extra = 360 * 3;
    diceEl.style.transition = "transform 2s cubic-bezier(0.22, 0.85, 0.25, 1)";
    diceEl.style.transform = `rotateX(${rot.x + extra}deg) rotateY(${rot.y + extra}deg)`;

    // Гарантированно правильные эмодзи на гранях
    Object.entries(DICE_FACE_EMOJI).forEach(([face, emoji]) => {
        const el = diceEl.querySelector(`.dice-face.${face}`);
        if (el) el.textContent = emoji;
    });
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

    let result;
    try { result = await apiCall("/api/roll_dice"); }
    catch (e) { toast(e.message, "error"); state.rolling = false; return; }

    // Анимация на основе уже полученных значений
    setDiceToValue(d1el, result.dice[0]);
    setDiceToValue(d2el, result.dice[1]);

    setTimeout(() => {
        const e1 = DICE_FACE_EMOJI[Object.keys(DICE_FACE_EMOJI).find(k => DICE_FACE_EMOJI[k] === Object.values(DICE_FACE_EMOJI)[result.dice[0] - 1])] || "⚀";
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
        setBalance(result.balance);
        renderProfile();
        renderLeaderboard();
        state.rolling = false;
    }, 2200);
}

// ============================================================
//                    САПЁР
// ============================================================
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
        setBalance(currentUser.balance, false);
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
    if (!cfg || state.saperSafe === 0) {
        btn.style.display = "none";
        return;
    }
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

        // Открываем все мины
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

        if (state.saperSafe >= state.saperTotal) {
            await saperCashOut();
        }
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
    } catch (e) {
        toast(e.message, "error");
        return;
    }

    const el = document.getElementById("saper-result");
    if (result.reward > 0) {
        el.innerHTML = `<span style="color:#22dd88">✅ +${result.reward} 🪙 (${cellsOpened} клеток)</span>`;
        el.classList.add("win");
        hapticNotify("success");
    } else {
        el.innerHTML = `<span style="color:#ff3b5b">💥 Пусто</span>`;
        el.classList.add("lose");
    }
    setBalance(result.balance);
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

// ============================================================
//                    МАГАЗИН
// ============================================================
const TOPUP_OPTIONS = [
    { coins: 100,  stars: 10 },
    { coins: 500,  stars: 50 },
    { coins: 2000, stars: 200 },
    { coins: 5000, stars: 500 },
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
    grid.innerHTML = TOPUP_OPTIONS.map(o => `
        <button class="shop-card" onclick="buyCoins(${o.coins})">
            <div class="shop-coin">🪙</div>
            <div class="shop-amount">${o.coins}</div>
            <div class="shop-price">${o.stars} ⭐</div>
        </button>`).join("") + `
        <button class="shop-card gold" onclick="openCustomTopUp()">
            <div class="shop-coin">✨</div>
            <div class="shop-amount">Своя сумма</div>
            <div class="shop-price">от 100 🪙</div>
        </button>`;
}

async function buyCoins(coins) {
    haptic("medium");
    try {
        const data = await apiCall("/api/invoice/coins", { coins });
        if (DEMO) {
            currentUser.balance += coins;
            setBalance(currentUser.balance);
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

// ============================================================
//                    ПОДДЕРЖКА
// ============================================================
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

// ============================================================
//                    DAILY / REF
// ============================================================
async function claimDaily() {
    const btn = document.getElementById("daily-btn");
    btn.disabled = true;
    try {
        const r = await apiCall("/api/daily");
        setBalance(r.balance);
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

// ============================================================
//                    СТАРТ
// ============================================================
if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootstrap);
} else {
    bootstrap();
}