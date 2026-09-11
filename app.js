/* LIFELESS SHOP · v11 */
const FORCE_DEMO = true;
let tg = window.Telegram?.WebApp;
const DEMO = FORCE_DEMO || !tg?.initData;

if (!tg) {
    tg = { initData: "", initDataUnsafe: { user: { id: 0, first_name: "Гость", username: "guest" } },
        expand: () => {}, close: () => {}, showPopup: (o) => alert(o.message || o.title || ""),
        openTelegramLink: (u) => window.open(u, "_blank"), openLink: (u) => window.open(u, "_blank"),
        sendData: () => {}, HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {} } };
} else { try { tg.expand(); } catch (_) {}; tg.setHeaderColor?.("#06060f"); tg.setBackgroundColor?.("#06060f"); }

const API_BASE = location.origin;
const BOT_USERNAME = "Solver_Life_bot";
const BASE_URL = "https://solver-bit.github.io/lifeless_minimap";
const LOTTIE_URLS = {
    coin: `${BASE_URL}/finance-management.json`,
    cat: `${BASE_URL}/Loadercat.json`,
    about: `${BASE_URL}/Businessplan.json`,
};

const TG_USER_ID = tg.initDataUnsafe?.user?.id || 0;
const LS_KEY = `lifeless_demo_v11_u${TG_USER_ID}`;
const LS_MUSIC_KEY = `lifeless_music_v11_u${TG_USER_ID}`;
const LS_PETS_KEY = `lifeless_pets_v11_u${TG_USER_ID}`;
const LS_DECOR_KEY = `lifeless_decor_v11_u${TG_USER_ID}`;

const defaultUser = { id: 0, first_name: "", last_name: "", username: "", avatar_url: "", balance: 0,
    cases_opened: 0, referrals: 0, stars_spent: 0, total_wagered: 0, best_drop: 0, drops: [],
    rank: 1, total_users: 1, ref_link: "", last_free_case: 0, last_daily: "", last_free_wheel: 0 };

let currentUser = { ...defaultUser };
const state = {
    spinning: false, rolling: false, caseOpening: false,
    saperActive: false, saperSafe: 0, saperTotal: 0, saperConfig: null,
    currentShopCat: "coins", currentCaseCat: "coins", currentDecorTab: "color",
    ownedPets: [], petPos: "br", petSize: "md", petInHeader: false,
    nameColor: "", frameId: "",
    petLottie: null, sidePetLottie: null, headerPetLottie: null, previewLottie: null,
    musicShuffle: false, musicRepeat: "off",
    coinPlaying: false,
};
const lottieInstances = {};

function haptic(t = "light") { try { tg.HapticFeedback?.impactOccurred(t); } catch (_) {} }
function hapticNotify(t = "success") { try { tg.HapticFeedback?.notificationOccurred(t); } catch (_) {} }

function toast(msg, type = "info", ms = 2800) {
    const cont = document.getElementById("toast-container");
    if (!cont) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    cont.appendChild(el);
    setTimeout(() => {
        el.style.opacity = "0";
        el.style.transform = "translate3d(120%,0,0)";
        el.style.transition = "opacity 0.5s ease, transform 0.5s cubic-bezier(0.32, 0.72, 0, 1)";
    }, ms);
    setTimeout(() => el.remove(), ms + 600);
}
function openLink(url) { if (tg.openTelegramLink) tg.openTelegramLink(url); else window.open(url, "_blank"); }
function formatNum(n) { if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".0", "") + "M"; if (n >= 1_000) return (n / 1_000).toFixed(1).replace(".0", "") + "K"; return String(n); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function makeInitialsAvatar(f, l, u) {
    let letters = "";
    if (f) letters += f.charAt(0);
    if (l) letters += l.charAt(0);
    if (!letters) letters = (u || "?").charAt(0);
    letters = letters.toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00aaff"/><stop offset="50%" stop-color="#c04cff"/><stop offset="100%" stop-color="#ffd700"/></linearGradient></defs><rect width="200" height="200" fill="#06060f"/><circle cx="100" cy="100" r="90" fill="url(#g)" opacity="0.9"/><text x="100" y="100" font-family="-apple-system,sans-serif" font-size="90" font-weight="900" fill="#06060f" text-anchor="middle" dominant-baseline="central">${escapeHtml(letters)}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* LOTTIE */
function loadLottie(container, url, id) {
    if (typeof lottie === "undefined") return null;
    if (id && lottieInstances[id]) { lottieInstances[id].destroy(); delete lottieInstances[id]; }
    try {
        const inst = lottie.loadAnimation({
            container, renderer: "svg", loop: true, autoplay: true, path: url,
            rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
        });
        if (id) lottieInstances[id] = inst;
        return inst;
    } catch (e) { console.error(e); return null; }
}
function initLottie() {
    if (typeof lottie === "undefined") return;
    const lc = document.getElementById("loader-cat"); if (lc) loadLottie(lc, LOTTIE_URLS.cat, "loaderCat");
    const hc = document.getElementById("header-coin-lottie"); if (hc) loadLottie(hc, LOTTIE_URLS.coin, "headerCoin");
    const sc = document.getElementById("side-coin-lottie"); if (sc) loadLottie(sc, LOTTIE_URLS.coin, "sideCoin");
}

/* DB */
function loadDemo() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            return { ...defaultUser, balance: typeof p.balance === "number" ? p.balance : 50000,
                cases_opened: p.cases_opened || 0, referrals: p.referrals || 0,
                stars_spent: p.stars_spent || 0, total_wagered: p.total_wagered || 0,
                best_drop: p.best_drop || 0, drops: Array.isArray(p.drops) ? p.drops : [],
                last_free_case: p.last_free_case || 0, last_daily: p.last_daily || "",
                last_free_wheel: p.last_free_wheel || 0 };
        }
    } catch (_) {}
    return { ...defaultUser, balance: 50000 };
}
function saveDemo() {
    if (!DEMO) return;
    try {
        localStorage.setItem(LS_KEY, JSON.stringify({
            balance: currentUser.balance, cases_opened: currentUser.cases_opened,
            referrals: currentUser.referrals, stars_spent: currentUser.stars_spent,
            total_wagered: currentUser.total_wagered, best_drop: currentUser.best_drop,
            drops: currentUser.drops.slice(0, 30), last_free_case: currentUser.last_free_case,
            last_daily: currentUser.last_daily, last_free_wheel: currentUser.last_free_wheel,
        }));
    } catch (_) {}
}
function resetDemo() {
    if (!confirm("Сбросить весь прогресс?")) return;
    try { [LS_KEY, LS_PETS_KEY, LS_DECOR_KEY].forEach(k => localStorage.removeItem(k)); } catch (_) {}
    location.reload();
}

/* ПИТОМЦЫ */
function loadPetsState() {
    try {
        const raw = localStorage.getItem(LS_PETS_KEY);
        if (raw) { const p = JSON.parse(raw); state.ownedPets = p.owned || []; state.petPos = p.pos || "br"; state.petSize = p.size || "md"; state.petInHeader = p.inHeader || false; }
    } catch (_) {}
}
function savePetsState() { try { localStorage.setItem(LS_PETS_KEY, JSON.stringify({ owned: state.ownedPets, pos: state.petPos, size: state.petSize, inHeader: state.petInHeader })); } catch (_) {} }
function hasPet(id) { return state.ownedPets.includes(id); }
const PETS_LIST = [
    { id: "cat", name: "Кот", emoji: "🐱", price: 25, url: LOTTIE_URLS.cat, desc: "Милый анимированный кот" },
];

/* УКРАШЕНИЯ */
const NAME_COLORS = [
    { id: "", name: "Обычный (белый)", cls: "", price: 0 },
    { id: "gold", name: "Золотой", cls: "name-color-gold", price: 5000, currency: "coins" },
    { id: "blue", name: "Синий", cls: "name-color-blue", price: 5000, currency: "coins" },
    { id: "pink", name: "Розовый", cls: "name-color-pink", price: 5000, currency: "coins" },
    { id: "purple", name: "Фиолетовый", cls: "name-color-purple", price: 5000, currency: "coins" },
    { id: "rainbow", name: "Радужный", cls: "name-color-rainbow", price: 25, currency: "stars" },
];
const FRAMES = [
    { id: "", name: "Нет", cls: "", price: 0 },
    { id: "gold", name: "Золотая", cls: "frame-gold", price: 10000, currency: "coins" },
    { id: "blue", name: "Синяя", cls: "frame-blue", price: 10000, currency: "coins" },
    { id: "fire", name: "Огненная", cls: "frame-fire", price: 25, currency: "stars" },
    { id: "legendary", name: "Легендарная", cls: "frame-legendary", price: 50, currency: "stars" },
];
function loadDecorState() {
    try {
        const raw = localStorage.getItem(LS_DECOR_KEY);
        if (raw) { const p = JSON.parse(raw); state.nameColor = p.color || ""; state.frameId = p.frame || ""; }
    } catch (_) {}
}
function saveDecorState() { try { localStorage.setItem(LS_DECOR_KEY, JSON.stringify({ color: state.nameColor, frame: state.frameId })); } catch (_) {} }

/* ЭКОНОМИКА */
const CASE_COSTS = { "10": 10, "50": 50, "250": 250, "1000": 1000, "5000": 5000, "10000": 10000 };
const MULTIPLIERS = [0.0, 0.5, 1.0, 1.5, 2.0, 4.0];
const MULT_WEIGHTS = [40, 20, 20, 12, 6, 2];
const MULT_TO_RARITY = [
    { key: "common", label: "Пусто", emoji: "💨" }, { key: "common", label: "Обычный", emoji: "📦" },
    { key: "uncommon", label: "Хороший", emoji: "✨" }, { key: "rare", label: "Редкий", emoji: "💎" },
    { key: "epic", label: "Эпик", emoji: "🔥" }, { key: "legendary", label: "ЛЕГЕНДА", emoji: "👑" },
];
function pickMultiplierIndex() {
    const total = MULT_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < MULT_WEIGHTS.length; i++) if ((r -= MULT_WEIGHTS[i]) <= 0) return i;
    return 0;
}
function getRtp(cases) { if (cases < 4) return 1.15; if (cases < 6) return 1.15 - ((1.15 - 0.92) / 2) * (cases - 3); return 0.92; }
function isHappyHours() { const h = new Date().getHours(); return h >= 20 && h < 22; }
function applyHappy(x) { return isHappyHours() ? Math.floor(x * 1.2) : x; }

/* API */
async function apiCall(path, body = null) {
    if (DEMO) return demoApi(path, body);
    const headers = { "X-Init-Data": tg.initData || "" };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API_BASE}${path}`, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Ошибка запроса");
    return data;
}

async function demoApi(path, body) {
    await new Promise(r => setTimeout(r, 60));
    switch (path) {
        case "/api/me":
            return { id: currentUser.id, first_name: currentUser.first_name, last_name: currentUser.last_name,
                username: currentUser.username, avatar_url: currentUser.avatar_url, balance: currentUser.balance,
                cases_opened: currentUser.cases_opened, referrals: currentUser.referrals,
                stars_spent: currentUser.stars_spent, rank: currentUser.rank, total_users: currentUser.total_users,
                ref_link: currentUser.ref_link, is_admin: true, happy_hours: isHappyHours() };
        case "/api/leaderboard": return { top: generateLeaderboard() };
        case "/api/open_case": {
            const cost = CASE_COSTS[body.case_id]; if (!cost) throw new Error("Неверный кейс");
            if (currentUser.balance < cost) throw new Error("Недостаточно монет");
            currentUser.balance -= cost; currentUser.total_wagered += cost;
            const rtp = getRtp(currentUser.cases_opened);
            const mIdx = pickMultiplierIndex(); const m = MULTIPLIERS[mIdx];
            let reward = Math.floor(cost * m * rtp); reward = applyHappy(reward);
            currentUser.balance += reward; currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop(CASE_LABEL[body.case_id] || `Кейс ${cost}`, reward - cost, mIdx === MULTIPLIERS.length - 1);
            saveDemo();
            return { reward, cost, balance: currentUser.balance, multiplier: m, multiplier_index: mIdx, win: m >= 1.0, jackpot: mIdx === MULTIPLIERS.length - 1 };
        }
        case "/api/open_star_case": {
            const stars = body.stars; const cost = stars * 10;
            if (currentUser.balance < cost) throw new Error("Недостаточно монет");
            currentUser.balance -= cost; currentUser.total_wagered += cost;
            const rtp = getRtp(currentUser.cases_opened);
            const tables = { 1:[0,0.5,1.0,1.5,2.0,3.0], 3:[0,0.5,1.0,1.5,2.0,3.0], 5:[0,0.7,1.0,1.5,2.0,3.5], 10:[0,0.7,1.0,1.5,2.0,4.0], 25:[0,0.8,1.0,1.5,2.5,5.0], 50:[0,0.8,1.0,1.5,3.0,6.0], 75:[0,0.8,1.0,1.5,3.0,8.0], 100:[0,1.0,1.2,1.5,3.0,10.0], 250:[0,1.0,1.2,1.5,3.5,12.0], 500:[0,1.0,1.5,2.0,4.0,15.0] };
            const mults = tables[stars] || tables[10];
            const mIdx = pickMultiplierIndex(); const m = mults[mIdx];
            let reward = Math.floor(cost * m * rtp); reward = applyHappy(reward);
            currentUser.balance += reward; currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop(`⭐ ${STAR_LABEL[stars]}`, reward - cost, mIdx === MULTIPLIERS.length - 1);
            saveDemo();
            return { reward, cost, balance: currentUser.balance, multiplier: m, multiplier_index: mIdx, win: m >= 1.0, jackpot: mIdx === MULTIPLIERS.length - 1 };
        }
        case "/api/spin_wheel": {
            if (currentUser.balance < 10) throw new Error("Недостаточно монет");
            currentUser.balance -= 10; currentUser.total_wagered += 10;
            const prizes = [0, 5, 10, 15, 20, 25, 30, 50]; const weights = [25, 20, 18, 12, 10, 8, 5, 2];
            const total = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * total, idx = 0;
            for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) <= 0) { idx = i; break; }
            const reward = applyHappy(prizes[idx]);
            currentUser.balance += reward; currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop("Колесо фортуны", reward - 10, reward >= 30);
            saveDemo();
            return { index: idx, reward, cost: 10, balance: currentUser.balance, win: reward > 0 };
        }
        case "/api/spin_wheel_free": {
            const now = Date.now();
            if (now - (currentUser.last_free_wheel || 0) < 3600000) throw new Error("Раз в час");
            currentUser.last_free_wheel = now;
            const prizes = [5, 10, 15, 20, 25, 30, 40, 50];
            const reward = applyHappy(prizes[Math.floor(Math.random() * prizes.length)]);
            currentUser.balance += reward; currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop("Бесплатное колесо", reward, reward >= 30);
            saveDemo();
            return { index: Math.floor(Math.random() * 8), reward, balance: currentUser.balance };
        }
        case "/api/spin_wheel_vip": {
            const prizes = [500, 750, 1000, 1500, 2000, 2500, 3000, 5000];
            const reward = applyHappy(prizes[Math.floor(Math.random() * prizes.length)]);
            currentUser.balance += reward; currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop("VIP-колесо", reward, reward >= 2500);
            saveDemo();
            return { index: Math.floor(Math.random() * 8), reward, balance: currentUser.balance };
        }
        case "/api/roll_dice": {
            if (currentUser.balance < 10) throw new Error("Недостаточно монет");
            currentUser.balance -= 10; currentUser.total_wagered += 10;
            const d1 = 1 + Math.floor(Math.random() * 6), d2 = 1 + Math.floor(Math.random() * 6);
            const sum = d1 + d2;
            let reward = 0;
            if (sum === 12) reward = 40;
            else if (sum === 7 || sum === 11) reward = 25;
            else if (sum === 2 || sum === 8 || sum === 10) reward = 15;
            reward = applyHappy(reward);
            currentUser.balance += reward; currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop(`Кости ${d1}+${d2}`, reward - 10, sum === 12);
            saveDemo();
            return { dice: [d1, d2], total: sum, reward, cost: 10, balance: currentUser.balance, win: reward >= 15 };
        }
        case "/api/play_coin": {
            if (currentUser.balance < 10) throw new Error("Недостаточно монет");
            currentUser.balance -= 10; currentUser.total_wagered += 10;
            const side = Math.random() < 0.5 ? "eagle" : "king";
            const win = side === body.choice;
            const reward = win ? applyHappy(20) : 0;
            currentUser.balance += reward; currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop(`Монетка (${win ? "победа" : "проигрыш"})`, reward - 10, false);
            saveDemo();
            return { side, choice: body.choice, win, reward, balance: currentUser.balance };
        }
        case "/api/saper/start": {
            const cost = body.cost || 25;
            if (currentUser.balance < cost) throw new Error("Недостаточно монет");
            currentUser.balance -= cost; currentUser.total_wagered += cost;
            saveDemo();
            return { cost, balance: currentUser.balance };
        }
        case "/api/saper/finish": {
            const cellsOpened = body.cells_opened || 0;
            const config = state.saperConfig || { cost: 25, size: 5, mines: 5 };
            const totalCells = config.size * config.size;
            const safe = totalCells - config.mines;
            const pct = safe > 0 ? cellsOpened / safe : 0;
            const mult = 1 + pct * 1.5;
            const reward = Math.floor(config.cost * mult);
            const finalReward = applyHappy(reward);
            currentUser.balance += finalReward; currentUser.cases_opened++;
            if (finalReward > currentUser.best_drop) currentUser.best_drop = finalReward;
            addDrop("Сапёр", finalReward - config.cost, finalReward > config.cost * 2.5);
            saveDemo();
            return { reward: finalReward, balance: currentUser.balance };
        }
        case "/api/daily": {
            const today = new Date().toISOString().slice(0, 10);
            if (currentUser.last_daily === today) throw new Error("Уже получено сегодня");
            const reward = [15, 20, 25, 30, 50][Math.floor(Math.random() * 5)];
            currentUser.balance += reward; currentUser.last_daily = today;
            saveDemo();
            return { reward, balance: currentUser.balance };
        }
        case "/api/support": return { ok: true, delivered: 1 };
        case "/api/invoice/coins": { currentUser.balance += body.coins; saveDemo(); return { stars: Math.floor(body.coins / 10), coins: body.coins, demo: true }; }
        case "/api/free_case": {
            const now = Date.now(); const cooldown = 24 * 60 * 60 * 1000;
            if (now - (currentUser.last_free_case || 0) < cooldown) throw new Error("Ещё не готов");
            const reward = applyHappy(20 + Math.floor(Math.random() * 480));
            currentUser.balance += reward; currentUser.cases_opened++;
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
    currentUser.drops.unshift({ label, delta, jackpot, ts: Date.now(), user: currentUser.first_name || currentUser.username || "Ты", isMine: true });
    if (currentUser.drops.length > 30) currentUser.drops.length = 30;
    renderDropsFeed();
}
const AMBIENT_NAMES = ["CryptoKing", "Lucky7", "Neon", "ZeroX", "MaxWin", "Flash", "Void", "Nova", "Titan", "Ghost", "Ace", "Samurai", "Phantom", "Fury", "Blade", "Storm", "Venom", "Echo", "Frost", "Whale"];
const AMBIENT_CASES = ["Пыль", "Пепел", "Мелл", "Telega", "Оникс", "Бездна", "Колесо", "Кости", "Сапёр", "Монетка"];
let ambientDrops = [];
function seedAmbientDrops() {
    ambientDrops = []; const now = Date.now();
    for (let i = 0; i < 14; i++) {
        const name = AMBIENT_NAMES[i % AMBIENT_NAMES.length];
        const game = AMBIENT_CASES[(i * 7 + 3) % AMBIENT_CASES.length];
        const winRoll = (i * 73) % 100; const win = winRoll > 35;
        const delta = win ? 80 + ((i * 137) % 820) : -(30 + ((i * 53) % 180));
        ambientDrops.push({ label: game, delta, jackpot: win && winRoll > 92, ts: now - i * 1000 * 60 * (2 + (i % 5)), user: name, isMine: false });
    }
    ambientDrops.sort((a, b) => b.ts - a.ts);
}
function renderDropsFeed() {
    const box = document.getElementById("drops-feed");
    if (!box) return;
    const myDrops = (currentUser.drops || []).map(d => ({ ...d, isMine: true }));
    const merged = [...myDrops, ...ambientDrops].sort((a, b) => b.ts - a.ts).slice(0, 15);
    if (!merged.length) { box.innerHTML = `<div class="drop-row"><div class="drop-text">Пока пусто. Открой первый кейс!</div></div>`; return; }
    box.innerHTML = merged.map(d => {
        const cls = d.delta > 0 ? (d.jackpot ? "jackpot" : "win") : "lose";
        const sign = d.delta > 0 ? "+" : "";
        const prefix = d.isMine ? "⭐ " : "";
        return `<div class="drop-row"><div class="drop-icon">${d.jackpot ? "🌟" : d.delta > 0 ? "🎉" : "💔"}</div><div class="drop-text">${prefix}<b>${escapeHtml(d.user)}</b> · ${escapeHtml(d.label)}</div><div class="drop-value ${cls}">${sign}${d.delta.toLocaleString("ru-RU")} 🪙</div></div>`;
    }).join("");
}

/* СПРАВОЧНИКИ */
const CASE_LABEL = { "10": "Пыль", "50": "Пепел", "250": "Мелл", "1000": "Telega", "5000": "Оникс", "10000": "Бездна" };
const STAR_LABEL = { "1": "Фарм", "3": "Базовый", "5": "Лёгкий", "10": "Удача", "25": "Везучий", "50": "Подарки", "75": "Победа", "100": "Фортуна", "250": "Джекпот", "500": "NFT" };
const COIN_CASES = [
    { id: "10", name: "Пыль", price: 10, emoji: "📦", tag: "Старт", preview: ["📦","✨","💎"] },
    { id: "50", name: "Пепел", price: 50, emoji: "💼", tag: "Обычный", preview: ["✨","💎","🔥"] },
    { id: "250", name: "Мелл", price: 250, emoji: "🔥", tag: "Хайроллер", preview: ["💎","🔥","👑"] },
    { id: "1000", name: "Telega", price: 1000, emoji: "💎", tag: "Редкий", preview: ["🔥","👑","🌟"] },
    { id: "5000", name: "Оникс", price: 5000, emoji: "👑", tag: "Элита", preview: ["👑","🌟","💎"] },
    { id: "10000", name: "Бездна", price: 10000, emoji: "🌌", tag: "ТОП", preview: ["🌟","👑","🔥"] },
];
const STAR_CASES = [
    { id: "1", name: "Фарм", price: 1, emoji: "🌱", tag: "1⭐", preview: ["🌱","✨","💎"] },
    { id: "3", name: "Базовый", price: 3, emoji: "🎯", tag: "3⭐", preview: ["🎯","✨","💎"] },
    { id: "5", name: "Лёгкий", price: 5, emoji: "🎈", tag: "5⭐", preview: ["🎈","✨","💎"] },
    { id: "10", name: "Удача", price: 10, emoji: "🍀", tag: "10⭐", preview: ["🍀","💎","🔥"] },
    { id: "25", name: "Везучий", price: 25, emoji: "🎪", tag: "25⭐", preview: ["🎪","💎","🔥"] },
    { id: "50", name: "Подарки", price: 50, emoji: "🎁", tag: "50⭐", preview: ["🎁","🔥","👑"] },
    { id: "75", name: "Победа", price: 75, emoji: "🏆", tag: "75⭐", preview: ["🏆","🔥","👑"] },
    { id: "100", name: "Фортуна", price: 100, emoji: "⭐", tag: "100⭐", preview: ["⭐","👑","🌟"] },
    { id: "250", name: "Джекпот", price: 250, emoji: "💥", tag: "250⭐", preview: ["💥","👑","🌟"] },
    { id: "500", name: "NFT", price: 500, emoji: "🪐", tag: "500⭐", preview: ["🪐","🌟","👑"] },
];

/* BOOTSTRAP */
function bootstrap() {
    if (DEMO) Object.assign(currentUser, loadDemo());
    loadPetsState(); loadDecorState(); loadMusicState();
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
        initLottie();
        buildCases(); buildStarCases(); buildCarouselDots(); buildTopUpOptions();
        buildShopGrid(); buildVipGrid(); buildPetsGrid(); renderDecorShopPanel();
        buildWheel("wheel", [0, 5, 10, 15, 20, 25, 30, 50]);
        buildWheel("wheel-free", [5, 10, 15, 20, 25, 30, 40, 50]);
        buildWheel("wheel-vip", [500, 750, 1000, 1500, 2000, 2500, 3000, 5000]);
        bindCarouselSwipe(); bindEdgeSwipe(); bindSaperLevels();
        seedAmbientDrops(); initMusic();
        renderAll(); renderActivePet(); startFreeCaseTimer(); startHappyTimer(); renderTopToday();
        startFreeWheelTimer();
    } catch (e) { console.error(e); toast("Ошибка: " + e.message, "error", 5000); }

    setTimeout(() => {
        document.getElementById("global-loader").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
    }, 800);
}
function renderAll() {
    renderProfile(); renderSideMenu(); renderDropsFeed();
    renderLeaderboard(); setBalance(currentUser.balance, false);
    renderMusicPlayer(); renderMyMusic(); renderMiniPlayer();
}
function renderTopToday() {
    const top = generateLeaderboard();
    const winner = top[0];
    const nameEl = document.getElementById("top-today-name");
    const balEl = document.getElementById("top-today-balance");
    if (nameEl) nameEl.textContent = winner ? winner.username : "—";
    if (balEl) balEl.textContent = winner ? `${winner.balance.toLocaleString("ru-RU")} 🪙` : "";
}

/* SIDE MENU */
function openSideMenu() { document.getElementById("side-menu").classList.add("open"); document.getElementById("side-overlay").classList.add("open"); haptic("light"); }
function closeSideMenu() { document.getElementById("side-menu").classList.remove("open"); document.getElementById("side-overlay").classList.remove("open"); }
document.querySelectorAll(".side-item").forEach(btn => {
    btn.addEventListener("click", () => {
        const tab = btn.dataset.tab;
        if (!tab) return;
        document.querySelectorAll(".side-item").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        switchTab(tab); closeSideMenu();
    });
});
function renderSideMenu() {
    const u = tg.initDataUnsafe?.user || {};
    const avatar = document.getElementById("side-avatar");
    if (avatar) {
        if (currentUser.avatar_url) { avatar.src = currentUser.avatar_url; avatar.onerror = () => { avatar.src = makeInitialsAvatar(currentUser.first_name, currentUser.last_name, currentUser.username); avatar.onerror = null; }; }
        else avatar.src = makeInitialsAvatar(u.first_name || currentUser.first_name, u.last_name || currentUser.last_name, u.username || currentUser.username);
    }
    const nameEl = document.getElementById("side-name");
    if (nameEl) nameEl.textContent = [u.first_name || currentUser.first_name, u.last_name || currentUser.last_name].filter(Boolean).join(" ") || "Игрок";
    const unEl = document.getElementById("side-username");
    if (unEl) unEl.textContent = (u.username || currentUser.username) ? `@${u.username || currentUser.username}` : `ID: ${currentUser.id}`;
    const balEl = document.getElementById("side-balance-val");
    if (balEl) balEl.textContent = currentUser.balance.toLocaleString("ru-RU");

    const sidePetSlot = document.getElementById("side-pet-slot");
    const sidePetBtn = document.getElementById("side-pet-btn");
    if (sidePetSlot && hasPet("cat")) {
        sidePetSlot.style.display = "block";
        sidePetSlot.style.bottom = "-10px";
        sidePetSlot.style.right = "-10px";
        if (!state.sidePetLottie) state.sidePetLottie = loadLottie(sidePetSlot, LOTTIE_URLS.cat, "sidePet");
        if (sidePetBtn) sidePetBtn.style.display = "block";
    } else if (sidePetSlot) {
        sidePetSlot.style.display = "none";
        if (sidePetBtn) sidePetBtn.style.display = "none";
    }
}

function bindEdgeSwipe() {
    const el = document.getElementById("edge-swipe");
    if (!el) return;
    let startX = 0, startY = 0;
    const onStart = (e) => { const t = e.touches ? e.touches[0] : e; startX = t.clientX; startY = t.clientY; };
    const onMove = (e) => {
        const t = e.touches ? e.touches[0] : e;
        const dx = t.clientX - startX, dy = t.clientY - startY;
        if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) && dx > 0) openSideMenu();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("click", openSideMenu);
}

/* ПРОФИЛЬ */
function renderProfile() {
    const u = tg.initDataUnsafe?.user || {};
    const avatarEl = document.getElementById("profile-avatar");
    if (avatarEl) {
        if (currentUser.avatar_url) { avatarEl.src = currentUser.avatar_url; avatarEl.onerror = () => { avatarEl.src = makeInitialsAvatar(currentUser.first_name, currentUser.last_name, currentUser.username); avatarEl.onerror = null; }; }
        else avatarEl.src = makeInitialsAvatar(u.first_name || currentUser.first_name, u.last_name || currentUser.last_name, u.username || currentUser.username);
        avatarEl.className = "profile-avatar";
        const frame = FRAMES.find(f => f.id === state.frameId);
        if (frame && frame.cls) avatarEl.classList.add(frame.cls);
    }
    const nameEl = document.getElementById("profile-name");
    if (nameEl) {
        nameEl.textContent = [u.first_name || currentUser.first_name, u.last_name || currentUser.last_name].filter(Boolean).join(" ") || "Игрок";
        nameEl.className = "profile-name";
        const color = NAME_COLORS.find(c => c.id === state.nameColor);
        if (color && color.cls) nameEl.classList.add(color.cls);
    }
    const unEl = document.getElementById("profile-username");
    if (unEl) unEl.textContent = (u.username || currentUser.username) ? `@${u.username || currentUser.username}` : `ID: ${currentUser.id}`;
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

/* ПИТОМЕЦ */
function renderActivePet() {
    // Очищаем все слоты
    const positions = ["tl", "tr", "bl", "br"];
    positions.forEach(p => { const el = document.getElementById(`profile-pet-${p}`); if (el) { el.style.display = "none"; el.innerHTML = ""; } });
    const headerSlot = document.getElementById("header-pet-slot");
    if (headerSlot) { headerSlot.style.display = "none"; headerSlot.innerHTML = ""; }

    if (state.petLottie) { state.petLottie.destroy(); state.petLottie = null; }
    if (state.headerPetLottie) { state.headerPetLottie.destroy(); state.headerPetLottie = null; }

    if (!hasPet("cat")) return;

    // Определяем куда ставить
    if (state.petInHeader) {
        if (headerSlot) {
            headerSlot.style.display = "block";
            setTimeout(() => { state.headerPetLottie = loadLottie(headerSlot, LOTTIE_URLS.cat, "headerPet"); }, 50);
        }
    } else {
        const pos = state.petPos; // tl | tr | bl | br
        const slot = document.getElementById(`profile-pet-${pos}`);
        if (slot) {
            slot.style.display = "block";
            slot.className = `pet-slot-abs pet-pos-${pos} pet-size-${state.petSize}`;
            setTimeout(() => { state.petLottie = loadLottie(slot, LOTTIE_URLS.cat, "profilePet"); }, 50);
        }
    }
    renderSideMenu();
}

/* БАЛАНС */
let balanceAnimFrame = null;
function animateBalance(from, to, duration = 700) {
    const els = ["coins", "profile-balance", "side-balance-val"].map(id => document.getElementById(id)).filter(Boolean);
    if (!els.length) return;
    if (balanceAnimFrame) cancelAnimationFrame(balanceAnimFrame);
    const start = performance.now();
    function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const cur = Math.round(from + (to - from) * eased);
        els.forEach(el => el.textContent = cur.toLocaleString("ru-RU"));
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
        if (pill) { pill.classList.add("bump"); setTimeout(() => pill.classList.remove("bump"), 400); }
    } else {
        ["coins", "profile-balance", "side-balance-val"].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = v.toLocaleString("ru-RU"); });
    }
    saveDemo();
}

/* ЛИДЕРБОРД */
function generateLeaderboard() {
    const list = AMBIENT_NAMES.slice(0, 20).map(name => { let seed = 0; for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0; return { username: name, balance: 60_000 + (seed % 900_000), cases: 100 + (seed % 900), isMine: false }; });
    list.push({ username: currentUser.first_name || currentUser.username || "Ты", balance: currentUser.balance, cases: currentUser.cases_opened, isMine: true });
    list.sort((a, b) => b.balance - a.balance);
    list.forEach((u, i) => { u.rank = i + 1; if (u.isMine) { currentUser.rank = i + 1; currentUser.total_users = list.length; } });
    return list;
}
function renderLeaderboard() {
    const box = document.getElementById("leaderboard-list");
    if (!box) return;
    const top = generateLeaderboard();
    box.innerHTML = top.map(u => {
        const cls = u.rank === 1 ? "gold" : u.rank === 2 ? "silver" : u.rank === 3 ? "bronze" : "";
        return `<div class="leader-row ${u.isMine ? 'me' : ''}"><div class="leader-rank ${cls}">#${u.rank}</div><div class="leader-name">${u.isMine ? '⭐ ' : ''}${escapeHtml(u.username)}</div><div class="leader-balance">${u.balance.toLocaleString("ru-RU")} 🪙</div></div>`;
    }).join("");
    const badge = document.getElementById("profile-badge");
    if (badge) badge.textContent = `#${currentUser.rank} из ${currentUser.total_users}`;
    renderTopToday();
}

/* НАВИГАЦИЯ */
function switchTab(tabId) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    const el = document.getElementById(`tab-${tabId}`);
    if (el) el.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
    document.querySelectorAll(".side-item").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
    if (tabId !== "games") closeGameView();
    if (tabId === "about" && !lottieInstances.about && typeof lottie !== "undefined") {
        const slot = document.getElementById("about-lottie");
        if (slot) lottieInstances.about = loadLottie(slot, LOTTIE_URLS.about, "about");
    }
    haptic("light");
    window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

function switchShopCat(cat) {
    state.currentShopCat = cat;
    document.querySelectorAll("#tab-shop .cat-tab").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
    document.querySelectorAll("#tab-shop .shop-panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`shop-panel-${cat}`).classList.add("active");
    haptic("light");
}
function switchCaseCat(cat) {
    state.currentCaseCat = cat;
    document.querySelectorAll("#tab-cases .cat-tab").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
    document.querySelectorAll("#tab-cases .cases-panel").forEach(p => p.classList.remove("active"));
    document.getElementById(`cases-panel-${cat}`).classList.add("active");
    haptic("light");
}

/* ИГРЫ */
function openGame(gameId) {
    const menu = document.getElementById("games-menu");
    if (menu) menu.classList.add("hidden");
    document.querySelectorAll(".game-view").forEach(v => v.classList.add("hidden"));
    const view = document.getElementById(`game-${gameId}`);
    if (view) view.classList.remove("hidden");
    if (gameId === "wheel-free") updateFreeWheelButton();
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
let currentSlide = 0, carouselTimer = null;
function buildCarouselDots() {
    const track = document.getElementById("carousel-track");
    if (!track) return;
    const n = track.children.length;
    const dots = document.getElementById("carousel-dots");
    if (!dots) return;
    dots.innerHTML = Array.from({ length: n }, (_, i) => `<i class="${i === 0 ? 'active' : ''}"></i>`).join("");
    startCarouselAuto();
}
function showSlide(i) {
    const track = document.getElementById("carousel-track");
    if (!track) return;
    const n = track.children.length;
    currentSlide = ((i % n) + n) % n;
    track.style.transform = `translate3d(-${currentSlide * 100}%, 0, 0)`;
    document.querySelectorAll("#carousel-dots i").forEach((d, idx) => d.classList.toggle("active", idx === currentSlide));
}
function startCarouselAuto() { if (carouselTimer) clearInterval(carouselTimer); carouselTimer = setInterval(() => showSlide(currentSlide + 1), 6500); }
function bindCarouselSwipe() {
    const el = document.getElementById("carousel");
    if (!el) return;
    let startX = 0, startY = 0, dx = 0, isDragging = false, startT = 0;
    const onStart = (e) => { const t = e.touches ? e.touches[0] : e; startX = t.clientX; startY = t.clientY; dx = 0; isDragging = true; startT = Date.now(); if (carouselTimer) clearInterval(carouselTimer); };
    const onMove = (e) => { if (!isDragging) return; const t = e.touches ? e.touches[0] : e; dx = t.clientX - startX; };
    const onEnd = () => {
        if (!isDragging) return; isDragging = false;
        const dt = Date.now() - startT;
        const speed = Math.abs(dx) / Math.max(dt, 1);
        if (Math.abs(dx) > 50 || (Math.abs(dx) > 20 && speed > 0.5)) { showSlide(dx > 0 ? currentSlide - 1 : currentSlide + 1); haptic("light"); }
        startCarouselAuto();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
}

/* HAPPY TIMER */
function startHappyTimer() {
    const el = document.getElementById("happy-timer");
    if (!el) return;
    function update() {
        const now = new Date();
        const h = now.getHours(), m = now.getMinutes();
        if (h >= 20 && h < 22) {
            const left = (22 * 60) - (h * 60 + m);
            const hh = Math.floor(left / 60), mm = left % 60;
            el.textContent = `осталось ${hh}ч ${String(mm).padStart(2, "0")}м`;
        } else {
            const target = h < 20 ? 20 : 32;
            const left = (target * 60) - (h * 60 + m);
            const hh = Math.floor(left / 60), mm = left % 60;
            el.textContent = `через ${hh}ч ${String(mm).padStart(2, "0")}м`;
        }
    }
    update(); setInterval(update, 60000);
}

/* КЕЙСЫ */
function buildCases() {
    const grid = document.getElementById("cases-grid");
    if (!grid) return;
    grid.innerHTML = COIN_CASES.map(c => `<button class="case-btn" data-case="${c.id}"><div class="case-tag">${c.tag}</div><div class="case-icon">${c.emoji}</div><div class="case-name">${c.name}</div><div class="case-price">${c.price.toLocaleString("ru-RU")} 🪙</div><div class="case-items-preview">${c.preview.map(p => `<span>${p}</span>`).join("")}</div></button>`).join("");
    grid.querySelectorAll(".case-btn").forEach(btn => btn.addEventListener("click", () => openCase(btn.dataset.case)));
}
function buildStarCases() {
    const grid = document.getElementById("star-cases-grid");
    if (!grid) return;
    grid.innerHTML = STAR_CASES.map(c => `<button class="case-btn star" data-star="${c.id}"><div class="case-tag">${c.tag}</div><div class="case-icon">${c.emoji}</div><div class="case-name">${c.name}</div><div class="case-price">${c.price} ⭐</div><div class="case-items-preview">${c.preview.map(p => `<span>${p}</span>`).join("")}</div></button>`).join("");
    grid.querySelectorAll(".case-btn").forEach(btn => btn.addEventListener("click", () => openStarCase(btn.dataset.star)));
}
async function openCase(caseId) {
    if (state.caseOpening) return;
    const caseData = COIN_CASES.find(c => c.id === caseId);
    if (!caseData) return;
    if (currentUser.balance < caseData.price) { toast("Недостаточно монет", "error"); hapticNotify("error"); return; }
    await runCaseAnimation(`Кейс «${caseData.name}»`, () => apiCall("/api/open_case", { case_id: caseId }));
}
async function openStarCase(starId) {
    if (state.caseOpening) return;
    const caseData = STAR_CASES.find(c => c.id === starId);
    if (!caseData) return;
    if (DEMO) {
        const coinsPrice = caseData.price * 10;
        if (currentUser.balance < coinsPrice) { toast(`Нужно ${coinsPrice} 🪙`, "error"); return; }
        await runCaseAnimation(`⭐ «${caseData.name}» · ${caseData.price}⭐`, () => apiCall("/api/open_star_case", { stars: caseData.price }));
    } else toast("Звёздные кейсы — в боте ⭐", "info");
}
async function runCaseAnimation(title, apiFn) {
    if (state.caseOpening) return;
    state.caseOpening = true;
    haptic("medium");
    const modal = document.getElementById("case-modal");
    const reel = document.getElementById("case-reel");
    const titleEl = document.getElementById("case-modal-title");
    const resEl = document.getElementById("case-modal-result");
    if (titleEl) titleEl.textContent = title;
    if (resEl) resEl.innerHTML = "&nbsp;";
    const WINNER_INDEX = 50;
    const items = [];
    for (let i = 0; i < 60; i++) items.push(MULT_TO_RARITY[Math.floor(Math.random() * MULT_TO_RARITY.length)]);
    items[WINNER_INDEX] = { key: "rare", label: "...", emoji: "❓" };
    reel.innerHTML = ""; reel.style.transition = "none"; reel.style.transform = "translate3d(0, 0, 0)";
    const fragment = document.createDocumentFragment();
    items.forEach(it => { const div = document.createElement("div"); div.className = `case-item r-${it.key}`; div.innerHTML = `${it.emoji}<small>${escapeHtml(it.label)}</small>`; fragment.appendChild(div); });
    reel.appendChild(fragment);
    modal.classList.remove("hidden");
    let result = null, apiError = null;
    try { result = await apiFn(); } catch (e) { apiError = e; }
    if (apiError) { toast(apiError.message || "Ошибка", "error"); modal.classList.add("hidden"); state.caseOpening = false; return; }
    const winnerRarity = MULT_TO_RARITY[result.multiplier_index] || MULT_TO_RARITY[0];
    const winnerEl = reel.children[WINNER_INDEX];
    if (winnerEl) { winnerEl.className = `case-item r-${winnerRarity.key}`; winnerEl.innerHTML = `${winnerRarity.emoji}<small>${escapeHtml(winnerRarity.label)}</small>`; }
    void reel.offsetWidth;
    let wrapWidth = 340;
    const wrapEl = modal.querySelector(".case-reel-wrap");
    if (wrapEl) wrapWidth = wrapEl.getBoundingClientRect().width || 340;
    const ITEM_WIDTH = 90 + 6;
    const targetX = -(WINNER_INDEX * ITEM_WIDTH + ITEM_WIDTH / 2 - wrapWidth / 2);
    const jitter = (Math.random() - 0.5) * (ITEM_WIDTH * 0.4);
    reel.style.transition = "transform 3.6s var(--ease-smooth)";
    reel.style.transform = `translate3d(${targetX + jitter}px, 0, 0)`;
    const fallbackId = setTimeout(() => { if (state.caseOpening) showCaseResult(result); }, 4300);
    setTimeout(() => { clearTimeout(fallbackId); if (state.caseOpening) showCaseResult(result); }, 3700);
}
function showCaseResult(result) {
    if (!state.caseOpening || !result) return;
    state.caseOpening = false;
    const modal = document.getElementById("case-modal");
    const resEl = document.getElementById("case-modal-result");
    const isJackpot = result.jackpot;
    if (result.win) {
        const profit = result.reward - result.cost;
        const profitColor = profit >= 0 ? "#22dd88" : "#ff3b5b";
        const profitSign = profit >= 0 ? "+" : "";
        resEl.innerHTML = `<span style="color:${isJackpot ? '#ff3b5b' : '#ffd700'};text-shadow:0 0 30px currentColor">${isJackpot ? "🎉 JACKPOT!" : "🏆 ПОБЕДА!"}</span><div style="margin-top:14px;font-size:20px;color:#fff">Выигрыш: <b>${result.reward.toLocaleString("ru-RU")}</b> 🪙</div><div style="margin-top:6px;font-size:15px;color:${profitColor}">Чистыми: <b>${profitSign}${profit.toLocaleString("ru-RU")}</b> 🪙</div>`;
        hapticNotify("success");
    } else {
        resEl.innerHTML = `<span style="color:#ff3b5b;font-size:22px">💔 Проигрыш</span><div style="margin-top:14px;font-size:15px;color:#ff3b5b">Чистыми: <b>-${result.cost.toLocaleString("ru-RU")}</b> 🪙</div>`;
        hapticNotify("error");
    }
    const balanceBefore = result.balance - result.reward + result.cost;
    setBalance(result.balance, true, balanceBefore);
    renderProfile(); renderLeaderboard();
    setTimeout(() => modal.classList.add("hidden"), 2400);
}
function forceCloseCase() { state.caseOpening = false; const modal = document.getElementById("case-modal"); if (modal) modal.classList.add("hidden"); }

/* БЕСПЛАТНЫЙ КЕЙС */
let freeCaseTimerId = null;
const FREE_CASE_COOLDOWN = 24 * 60 * 60 * 1000;
function startFreeCaseTimer() { if (freeCaseTimerId) clearInterval(freeCaseTimerId); updateFreeCaseUI(); freeCaseTimerId = setInterval(updateFreeCaseUI, 1000); }
function updateFreeCaseUI() {
    const card = document.getElementById("free-case-card");
    const timer = document.getElementById("free-case-timer");
    if (!card || !timer) return;
    const diff = Date.now() - (currentUser.last_free_case || 0);
    if (diff >= FREE_CASE_COOLDOWN) { card.classList.remove("disabled"); timer.textContent = "Готов к открытию!"; timer.style.color = "var(--gold)"; }
    else {
        card.classList.add("disabled");
        const left = FREE_CASE_COOLDOWN - diff;
        const h = Math.floor(left / 3_600_000), m = Math.floor((left % 3_600_000) / 60_000), s = Math.floor((left % 60_000) / 1000);
        timer.textContent = `Через ${h}ч ${String(m).padStart(2, "0")}м ${String(s).padStart(2, "0")}с`;
        timer.style.color = "var(--text-dim)";
    }
}
async function openFreeCase() {
    if (state.caseOpening) return;
    if (Date.now() - (currentUser.last_free_case || 0) < FREE_CASE_COOLDOWN) { toast("Ещё не готов", "error"); return; }
    await runCaseAnimation("🎁 Бесплатный кейс", () => apiCall("/api/free_case"));
    renderProfile(); renderLeaderboard();
}

/* КОЛЁСА */
const WHEEL_PRIZES = {
    "wheel": [0, 5, 10, 15, 20, 25, 30, 50],
    "wheel-free": [5, 10, 15, 20, 25, 30, 40, 50],
    "wheel-vip": [500, 750, 1000, 1500, 2000, 2500, 3000, 5000],
};
let wheelRotations = { "wheel": 0, "wheel-free": 0, "wheel-vip": 0 };

function buildWheel(wheelId, prizes) {
    const inner = document.getElementById(`${wheelId}-inner`);
    if (!inner) return;
    inner.innerHTML = "";
    const total = prizes.length, seg = 360 / total;
    prizes.forEach((prize, i) => {
        const label = document.createElement("div");
        label.className = "wheel-seg-label";
        const angle = i * seg + seg / 2;
        label.style.transform = `rotate(${angle - 90}deg) translate(90px, 0)`;
        label.textContent = prize === 0 ? "💀" : prize >= 1000 ? `${Math.floor(prize/1000)}K` : prize + "🪙";
        inner.appendChild(label);
    });
}

async function spinWheelGeneric(wheelId, apiPath, btnId, resultId) {
    const btn = document.getElementById(btnId);
    if (btn.disabled) return;
    btn.disabled = true;
    haptic("medium");
    const wheelEl = document.getElementById(wheelId);
    const resultEl = document.getElementById(resultId);
    resultEl.textContent = ""; resultEl.className = "game-result";

    let result;
    try { result = await apiCall(apiPath, {}); }
    catch (e) { toast(e.message, "error"); btn.disabled = false; return; }

    const prizes = WHEEL_PRIZES[wheelId];
    const seg = 360 / prizes.length;
    const current = wheelRotations[wheelId];
    const normalizedCurrent = ((current % 360) + 360) % 360;
    const targetIn360 = (360 - (result.index * seg + seg / 2)) % 360;
    const delta = (targetIn360 - normalizedCurrent + 360) % 360;
    wheelRotations[wheelId] += 360 * 5 + delta;
    wheelEl.style.transform = `rotate(${wheelRotations[wheelId]}deg)`;

    setTimeout(() => {
        if (result.reward > 0) {
            resultEl.textContent = `🎉 +${result.reward.toLocaleString("ru-RU")} 🪙`;
            resultEl.classList.add("win");
            hapticNotify("success");
        } else {
            resultEl.textContent = "💀 Пусто";
            resultEl.classList.add("lose");
            hapticNotify("error");
        }
        animateBalance(currentUser.balance, result.balance, 700);
        currentUser.balance = result.balance;
        saveDemo();
        renderProfile(); renderLeaderboard();
        btn.disabled = false;
        wheelEl.style.transition = "none";
        wheelRotations[wheelId] = wheelRotations[wheelId] % 360;
        wheelEl.style.transform = `rotate(${wheelRotations[wheelId]}deg)`;
        setTimeout(() => { wheelEl.style.transition = "transform 5s var(--ease-smooth)"; }, 50);
    }, 5100);
}

function spinWheel() { return spinWheelGeneric("wheel", "/api/spin_wheel", "spin-btn", "wheel-result"); }
function spinWheelFree() { return spinWheelGeneric("wheel-free", "/api/spin_wheel_free", "spin-free-btn", "wheel-free-result"); }
function spinWheelVip() { return spinWheelGeneric("wheel-vip", "/api/spin_wheel_vip", "spin-vip-btn", "wheel-vip-result"); }

/* Таймер бесплатного колеса */
let freeWheelTimer = null;
function startFreeWheelTimer() {
    if (freeWheelTimer) clearInterval(freeWheelTimer);
    updateFreeWheelButton();
    freeWheelTimer = setInterval(updateFreeWheelButton, 1000);
}
function updateFreeWheelButton() {
    const btn = document.getElementById("spin-free-btn");
    if (!btn) return;
    const diff = Date.now() - (currentUser.last_free_wheel || 0);
    const cooldown = 60 * 60 * 1000;
    if (diff >= cooldown) { btn.disabled = false; btn.textContent = "Крутить бесплатно"; }
    else {
        const left = cooldown - diff;
        const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
        btn.disabled = true; btn.textContent = `Через ${m}м ${String(s).padStart(2,"0")}с`;
    }
}

/* МОНЕТКА */
async function playCoin(choice) {
    if (state.coinPlaying) return;
    state.coinPlaying = true;
    haptic("medium");
    const coinEl = document.getElementById("coin3d");
    const resultEl = document.getElementById("coin-result");
    const btnEagle = document.getElementById("coin-eagle");
    const btnKing = document.getElementById("coin-king");
    btnEagle.disabled = true; btnKing.disabled = true;
    resultEl.textContent = ""; resultEl.className = "game-result";

    let result;
    try { result = await apiCall("/api/play_coin", { choice }); }
    catch (e) { toast(e.message, "error"); btnEagle.disabled = false; btnKing.disabled = false; state.coinPlaying = false; return; }

    // Вращение монеты: орёл = 0deg, решка = 180deg
    const finalRotation = (result.side === "eagle" ? 0 : 180) + 360 * 8;
    coinEl.style.transition = "transform 2.5s var(--ease-smooth)";
    coinEl.style.transform = `rotateY(${finalRotation}deg)`;

    setTimeout(() => {
        if (result.win) {
            resultEl.innerHTML = `🎉 ${result.side === "eagle" ? "🦅 Орёл" : "👑 Решка"} — победа! <b>+${result.reward}</b> 🪙`;
            resultEl.classList.add("win"); hapticNotify("success");
        } else {
            resultEl.innerHTML = `💔 ${result.side === "eagle" ? "🦅 Орёл" : "👑 Решка"} — проигрыш`;
            resultEl.classList.add("lose"); hapticNotify("error");
        }
        const before = result.balance - result.reward + 10;
        animateBalance(before, result.balance, 700);
        currentUser.balance = result.balance; saveDemo();
        renderProfile(); renderLeaderboard();
        btnEagle.disabled = false; btnKing.disabled = false;
        state.coinPlaying = false;
    }, 2600);
}

/* КОСТИ */
const DICE_ROTATIONS = { 1:{x:0,y:0}, 2:{x:-90,y:0}, 3:{x:0,y:-90}, 4:{x:0,y:90}, 5:{x:90,y:0}, 6:{x:0,y:180} };
function setDiceToValue(diceEl, value, delay = 0) {
    const rot = DICE_ROTATIONS[value] || DICE_ROTATIONS[1];
    const extraX = 360 * (4 + Math.floor(Math.random() * 3));
    const extraY = 360 * (4 + Math.floor(Math.random() * 3));
    const extraZ = 90 * (Math.floor(Math.random() * 4) - 2);
    const duration = 2.2 + Math.random() * 0.5;
    diceEl.style.transition = `transform ${duration}s var(--ease-smooth) ${delay}s`;
    diceEl.style.transform = `rotateX(${rot.x + extraX}deg) rotateY(${rot.y + extraY}deg) rotateZ(${extraZ}deg)`;
}
async function rollDice() {
    if (state.rolling) return;
    if (currentUser.balance < 10) { toast("Нужно 10 🪙", "error"); return; }
    state.rolling = true; haptic("medium");
    const d1el = document.getElementById("dice1"), d2el = document.getElementById("dice2");
    const resultEl = document.getElementById("dice-result");
    resultEl.textContent = ""; resultEl.className = "game-result";
    const balanceBefore = currentUser.balance;

    let result;
    try { result = await apiCall("/api/roll_dice"); }
    catch (e) { toast(e.message, "error"); state.rolling = false; return; }

    d1el.style.transition = "none"; d2el.style.transition = "none";
    d1el.style.transform = "rotateX(0) rotateY(0) rotateZ(0)"; d2el.style.transform = "rotateX(0) rotateY(0) rotateZ(0)";
    void d1el.offsetWidth; void d2el.offsetWidth;
    setDiceToValue(d1el, result.dice[0], 0);
    setDiceToValue(d2el, result.dice[1], 0.1 + Math.random() * 0.15);

    setTimeout(() => {
        const e1 = ["⚀","⚁","⚂","⚃","⚄","⚅"][result.dice[0] - 1];
        const e2 = ["⚀","⚁","⚂","⚃","⚄","⚅"][result.dice[1] - 1];
        if (result.win) { resultEl.innerHTML = `🎲 ${e1} + ${e2} = <b>${result.total}</b> · <span style="color:#22dd88">+${result.reward} 🪙</span>`; resultEl.classList.add("win"); hapticNotify("success"); }
        else { resultEl.innerHTML = `🎲 ${e1} + ${e2} = <b>${result.total}</b> · <span style="color:#ff3b5b">проигрыш</span>`; resultEl.classList.add("lose"); hapticNotify("error"); }
        animateBalance(balanceBefore - 10, result.balance, 700);
        currentUser.balance = result.balance; saveDemo();
        renderProfile(); renderLeaderboard(); state.rolling = false;
    }, 2900);
}

/* САПЁР */
function bindSaperLevels() {
    document.querySelectorAll(".saper-level").forEach(btn => {
        btn.addEventListener("click", () => {
            state.saperConfig = { size: parseInt(btn.dataset.size), mines: parseInt(btn.dataset.mines), cost: parseInt(btn.dataset.cost) };
            startSaperGame();
        });
    });
}
async function startSaperGame() {
    const cfg = state.saperConfig;
    if (!cfg) return;
    if (currentUser.balance < cfg.cost) { toast(`Нужно ${cfg.cost} 🪙`, "error"); return; }
    if (DEMO) { const before = currentUser.balance; currentUser.balance -= cfg.cost; currentUser.total_wagered += cfg.cost; setBalance(currentUser.balance, true, before); saveDemo(); }
    else { try { await apiCall("/api/saper/start", { cost: cfg.cost }); } catch (e) { toast(e.message, "error"); return; } }
    haptic("medium");
    document.getElementById("saper-setup").classList.add("hidden");
    document.getElementById("saper-play").classList.remove("hidden");
    document.getElementById("saper-cashout").style.display = "none";
    const grid = document.getElementById("saper-grid");
    grid.style.gridTemplateColumns = `repeat(${cfg.size}, 1fr)`;
    grid.innerHTML = "";
    document.getElementById("saper-info").textContent = `${cfg.size}×${cfg.size} · ${cfg.mines} мин · ставка ${cfg.cost} 🪙`;
    const resEl = document.getElementById("saper-result"); resEl.textContent = ""; resEl.className = "game-result";
    const total = cfg.size * cfg.size;
    const mines = new Set();
    while (mines.size < cfg.mines) mines.add(Math.floor(Math.random() * total));
    const totalSafe = total - cfg.mines;
    state.saperActive = true; state.saperSafe = 0; state.saperTotal = totalSafe;
    for (let i = 0; i < total; i++) {
        const cell = document.createElement("div"); cell.className = "cell";
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
    const pct = state.saperSafe / state.saperTotal;
    const mult = 1 + pct * 1.5;
    const reward = Math.floor(cfg.cost * mult);
    btn.style.display = "block";
    valEl.textContent = reward.toLocaleString("ru-RU");
}
async function handleSaperClick(cell, isMine, index, mines) {
    if (!state.saperActive) return;
    if (cell.classList.contains("opened") || cell.classList.contains("mine")) return;
    if (isMine) {
        cell.textContent = "💣"; cell.classList.add("mine"); hapticNotify("error");
        document.querySelectorAll("#saper-grid .cell").forEach((c, idx) => { if (mines.has(idx) && c !== cell) { c.textContent = "💣"; c.classList.add("mine"); } });
        await finishSaper();
    } else {
        cell.textContent = "✅"; cell.classList.add("opened");
        state.saperSafe++; haptic("light");
        updateCashoutButton();
        if (state.saperSafe >= state.saperTotal) await saperCashOut();
    }
}
async function saperCashOut() { if (!state.saperActive || state.saperSafe === 0) return; state.saperActive = false; await finishSaper(); }
async function finishSaper() {
    const cellsOpened = state.saperSafe;
    let result;
    try {
        if (DEMO) {
            const cfg = state.saperConfig;
            const pct = state.saperTotal > 0 ? cellsOpened / state.saperTotal : 0;
            const mult = 1 + pct * 1.5;
            const reward = Math.floor(cfg.cost * mult);
            const finalReward = applyHappy(reward);
            const before = currentUser.balance;
            currentUser.balance += finalReward; currentUser.cases_opened++;
            if (finalReward > currentUser.best_drop) currentUser.best_drop = finalReward;
            addDrop("Сапёр", finalReward - cfg.cost, finalReward > cfg.cost * 2.5); saveDemo();
            result = { reward: finalReward, balance: currentUser.balance, _before: before };
        } else { result = await apiCall("/api/saper/finish", { cells_opened: cellsOpened }); }
    } catch (e) { toast(e.message, "error"); return; }
    const el = document.getElementById("saper-result");
    if (result.reward > 0) { el.innerHTML = `<span style="color:#22dd88">✅ +${result.reward} 🪙 (${cellsOpened} клеток)</span>`; el.classList.add("win"); hapticNotify("success"); }
    else { el.innerHTML = `<span style="color:#ff3b5b">💥 Пусто</span>`; el.classList.add("lose"); }
    setBalance(result.balance, true, result._before || (result.balance - result.reward));
    renderProfile(); renderLeaderboard();
    document.getElementById("saper-cashout").style.display = "none";
    state.saperActive = false;
}
function resetSaperState() {
    state.saperActive = false; state.saperSafe = 0; state.saperConfig = null;
    const setup = document.getElementById("saper-setup"), play = document.getElementById("saper-play");
    if (setup) setup.classList.remove("hidden"); if (play) play.classList.add("hidden");
    const grid = document.getElementById("saper-grid"); if (grid) grid.innerHTML = "";
    const res = document.getElementById("saper-result"); if (res) { res.textContent = ""; res.className = "game-result"; }
    const btn = document.getElementById("saper-cashout"); if (btn) btn.style.display = "none";
}

/* МАГАЗИН */
const COIN_PACKS = [
    { coins: 100, stars: 10, cls: "", bonus: null },
    { coins: 250, stars: 25, cls: "", bonus: "+10%" },
    { coins: 500, stars: 50, cls: "", bonus: null },
    { coins: 1000, stars: 100, cls: "gold", bonus: "+15%" },
    { coins: 2500, stars: 250, cls: "", bonus: null },
    { coins: 5000, stars: 500, cls: "gold", bonus: "+20%" },
    { coins: 10000, stars: 1000, cls: "epic", bonus: "+25%" },
    { coins: 25000, stars: 2500, cls: "mega", bonus: "+30%" },
];
const VIP_ITEMS = [
    { id: "vip_day", name: "VIP на 1 день", emoji: "👑", cost: 25 },
    { id: "vip_week", name: "VIP на неделю", emoji: "👑", cost: 100 },
    { id: "vip_month", name: "VIP на месяц", emoji: "👑", cost: 300 },
    { id: "no_ads", name: "Без рекламы", emoji: "🚫", cost: 50 },
];

function buildTopUpOptions() {
    const box = document.getElementById("topup-options");
    if (!box) return;
    const quick = COIN_PACKS.slice(0, 4);
    box.innerHTML = quick.map(o => `
        <div class="topup-card" onclick="buyCoins(${o.coins})">
            ${o.bonus ? `<div class="topup-card-badge">${o.bonus}</div>` : ''}
            <div class="topup-card-coin">🪙</div>
            <div class="topup-card-amount">${o.coins.toLocaleString("ru-RU")}</div>
            <div class="topup-card-price">${o.stars} ⭐</div>
        </div>
    `).join("") + `<div class="topup-card custom" onclick="openCustomTopUp()"><div class="topup-card-coin">✨</div><div><div class="topup-card-amount">Своя сумма</div><div class="topup-card-price">от 100 🪙</div></div></div>`;
}
function buildShopGrid() {
    const grid = document.getElementById("shop-grid");
    if (!grid) return;
    let html = "";
    COIN_PACKS.forEach(o => {
        if (o.cls === "mega") {
            html += `<button class="shop-card coins mega" onclick="buyCoins(${o.coins})">${o.bonus ? `<div class="shop-badge best">${o.bonus}</div>` : ''}<div class="coin-big">💎</div><div class="coin-info"><div class="coin-amount">${o.coins.toLocaleString("ru-RU")} монет</div><div class="coin-stars">${o.stars} ⭐</div></div></button>`;
        } else {
            html += `<button class="shop-card coins ${o.cls}" onclick="buyCoins(${o.coins})">${o.bonus ? `<div class="coin-bonus">${o.bonus}</div>` : ''}<div class="coin-big">🪙</div><div class="coin-amount">${o.coins.toLocaleString("ru-RU")}</div><div class="coin-stars">${o.stars} ⭐</div></button>`;
        }
    });
    grid.innerHTML = html;
}
function renderDecorShopPanel() {
    const content = document.getElementById("shop-perks-content");
    if (!content) return;
    const items = state.currentDecorTab === "color" ? NAME_COLORS : FRAMES;
    const current = state.currentDecorTab === "color" ? state.nameColor : state.frameId;
    content.innerHTML = items.map(it => {
        const isActive = current === it.id;
        const isFree = it.price === 0;
        const priceText = isFree ? "Бесплатно" : `${it.price} ${it.currency === 'stars' ? '⭐' : '🪙'}`;
        let previewStyle = "";
        if (state.currentDecorTab === "color") {
            const colors = { "": "#fff", gold: "#ffd700", blue: "#00aaff", pink: "#ff3b8b", purple: "#c04cff" };
            if (it.id === "rainbow") previewStyle = "background: linear-gradient(90deg, #ff3b5b, #ffd700, #22dd88, #00aaff, #c04cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;";
            else previewStyle = `color: ${colors[it.id] || "#fff"};`;
        } else {
            const borders = { "": "#8a8aa0", gold: "#ffd700", blue: "#00aaff", fire: "#ff3b5b", legendary: "#c04cff" };
            previewStyle = `border-color: ${borders[it.id] || "#8a8aa0"};`;
        }
        return `<div class="decor-item ${isActive ? 'active' : ''}" onclick="selectDecor('${it.id}')"><div class="decor-preview" style="${previewStyle}">Aa</div><div class="decor-info"><div class="decor-name">${it.name}</div><div class="decor-price">${priceText}</div></div>${isActive ? '<div class="decor-status">✓</div>' : ''}</div>`;
    }).join("");
}
function switchDecorTab(tab, btn) {
    state.currentDecorTab = tab;
    document.querySelectorAll(".decor-tab").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderDecorShopPanel();
}
function selectDecor(id) {
    const items = state.currentDecorTab === "color" ? NAME_COLORS : FRAMES;
    const item = items.find(x => x.id === id);
    if (!item) return;
    if (item.price > 0) {
        if (item.currency === "coins") {
            if (currentUser.balance < item.price) { toast(`Нужно ${item.price} 🪙`, "error"); return; }
            const before = currentUser.balance;
            currentUser.balance -= item.price; saveDemo();
            setBalance(currentUser.balance, true, before);
        } else {
            toast(`Оплата ${item.price} ⭐ будет на сервере`, "info");
        }
    }
    if (state.currentDecorTab === "color") state.nameColor = id;
    else state.frameId = id;
    saveDecorState(); renderProfile(); renderDecorShopPanel();
    toast("✅ Применено", "success"); hapticNotify("success");
}
function openDecorShop() {
    switchTab("shop");
    switchShopCat("perks");
}
function buildVipGrid() {
    const grid = document.getElementById("shop-vip");
    if (!grid) return;
    grid.innerHTML = VIP_ITEMS.map(p => `<button class="shop-card vip" onclick="buyVip('${p.id}', ${p.cost})"><div class="shop-coin">${p.emoji}</div><div class="shop-name">${p.name}</div><div class="shop-price">${p.cost} ⭐</div></button>`).join("");
}
function buildPetsGrid() {
    const grid = document.getElementById("shop-pets");
    if (!grid) return;
    grid.innerHTML = PETS_LIST.map(p => {
        const owned = hasPet(p.id);
        return `<button class="shop-card pet ${owned ? 'owned' : ''}" onclick="${owned ? `openPetsManager()` : `openPetModal('${p.id}')`}"><div class="shop-coin">${p.emoji}</div><div class="shop-name">${p.name}</div><div class="shop-price">${owned ? "Настроить" : p.price + " ⭐"}</div></button>`;
    }).join("");
}
async function buyCoins(coins) {
    haptic("medium");
    const before = currentUser.balance;
    try {
        const data = await apiCall("/api/invoice/coins", { coins });
        if (DEMO) { setBalance(currentUser.balance, true, before); renderProfile(); renderLeaderboard(); toast(`🧪 Демо: +${coins} 🪙`, "success", 3000); closeModal("topup-modal"); return; }
        if (tg.openInvoice) tg.openInvoice(data.invoice_link, (status) => { if (status === "paid") { toast("✅ Оплата прошла!", "success", 3500); hapticNotify("success"); apiCall("/api/me").then(me => { Object.assign(currentUser, me); renderAll(); }); } });
        else tg.openLink(data.invoice_link);
        closeModal("topup-modal");
    } catch (e) { toast(e.message, "error"); }
}
async function buyVip(id, cost) { toast("💎 VIP появится на сервере", "info"); }

/* ПИТОМЕЦ */
let petToBuy = null;
function openPetModal(petId) {
    const pet = PETS_LIST.find(p => p.id === petId);
    if (!pet) return;
    petToBuy = pet;
    const owned = hasPet(pet.id);
    const titleEl = document.getElementById("pet-modal-title");
    const descEl = document.getElementById("pet-modal-desc");
    const btn = document.getElementById("pet-buy-btn");
    const preview = document.getElementById("pet-preview");
    if (titleEl) titleEl.textContent = `${pet.emoji} ${pet.name}`;
    if (descEl) descEl.textContent = pet.desc;
    if (btn) { btn.textContent = owned ? "Уже куплено" : `Купить за ${pet.price} ⭐`; btn.disabled = owned; }
    preview.innerHTML = "";
    setTimeout(() => { state.previewLottie = loadLottie(preview, pet.url, "previewPet"); }, 50);
    document.getElementById("pet-modal").classList.remove("hidden");
    haptic("light");
}
function confirmBuyPet() {
    if (!petToBuy) return;
    if (hasPet(petToBuy.id)) { toast("Уже куплено", "info"); return; }
    if (DEMO) {
        state.ownedPets.push(petToBuy.id);
        savePetsState(); renderActivePet(); buildPetsGrid();
        closeModal("pet-modal");
        toast(`🐱 ${petToBuy.name} добавлен!`, "success", 3000);
        hapticNotify("success");
        setTimeout(openPetsManager, 600);
        return;
    }
    toast("Оплата Stars будет на сервере", "info");
}

/* УПРАВЛЕНИЕ ПИТОМЦАМИ */
function openPetsManager() {
    const modal = document.getElementById("pets-manager-modal");
    const content = document.getElementById("pets-manager-content");
    if (!content) return;
    if (!hasPet("cat")) {
        content.innerHTML = `<div class="pm-empty">У тебя пока нет питомцев.<br>Купи кота в разделе Магазин → Питомцы</div>`;
        modal.classList.remove("hidden");
        return;
    }
    const positions = [
        { id: "tl", name: "↖ Верх-лево" },
        { id: "tr", name: "↗ Верх-право" },
        { id: "bl", name: "↙ Низ-лево" },
        { id: "br", name: "↘ Низ-право" },
    ];
    const sizes = [
        { id: "sm", name: "S" },
        { id: "md", name: "M" },
        { id: "lg", name: "L" },
    ];
    content.innerHTML = `
        <div class="pm-item">
            <div class="pm-item-header"><div class="pm-item-emoji">🐱</div><div class="pm-item-name">Кот</div></div>
            <div class="pm-row">
                <div class="pm-row-label">Место</div>
                <div class="pm-btns">
                    <button class="pm-btn ${!state.petInHeader ? 'active' : ''}" onclick="setPetInHeader(false)">Возле аватарки</button>
                    <button class="pm-btn ${state.petInHeader ? 'active' : ''}" onclick="setPetInHeader(true)">Верхний бар</button>
                </div>
            </div>
            ${!state.petInHeader ? `
            <div class="pm-row">
                <div class="pm-row-label">Позиция</div>
                <div class="pm-btns">
                    ${positions.map(p => `<button class="pm-btn ${state.petPos === p.id ? 'active' : ''}" onclick="setPetPos('${p.id}')">${p.name}</button>`).join("")}
                </div>
            </div>
            <div class="pm-row">
                <div class="pm-row-label">Размер</div>
                <div class="pm-btns">
                    ${sizes.map(s => `<button class="pm-btn ${state.petSize === s.id ? 'active' : ''}" onclick="setPetSize('${s.id}')">${s.name}</button>`).join("")}
                </div>
            </div>
            ` : ''}
            <button class="pm-btn pm-remove" onclick="removePet('cat')">Убрать питомца</button>
        </div>
    `;
    modal.classList.remove("hidden");
    haptic("light");
}
function setPetPos(pos) { state.petPos = pos; savePetsState(); renderActivePet(); openPetsManager(); haptic("light"); }
function setPetSize(size) { state.petSize = size; savePetsState(); renderActivePet(); openPetsManager(); haptic("light"); }
function setPetInHeader(v) { state.petInHeader = !!v; savePetsState(); renderActivePet(); openPetsManager(); haptic("light"); }
function removePet(id) {
    state.ownedPets = state.ownedPets.filter(x => x !== id);
    savePetsState(); renderActivePet(); buildPetsGrid();
    closeModal("pets-manager-modal");
    toast("Питомец убран", "info");
}

/* МОДАЛКИ */
function openTopUp() { document.getElementById("topup-modal").classList.remove("hidden"); haptic("light"); }
function openCustomTopUp() { document.getElementById("custom-modal").classList.remove("hidden"); }
function submitCustomTopUp() {
    const v = parseInt(document.getElementById("custom-coins-input").value);
    if (!v || v < 100 || v > 100000) { toast("Введите число от 100 до 100 000", "error"); return; }
    closeModal("custom-modal"); buyCoins(v);
}
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.add("hidden"); }

/* ПОДДЕРЖКА */
let selectedTopic = "Вопрос";
function selectTopic(btn) { document.querySelectorAll(".support-topic").forEach(b => b.classList.remove("active")); btn.classList.add("active"); selectedTopic = btn.dataset.topic; }
function openSupport() { document.getElementById("support-modal").classList.remove("hidden"); }
async function submitSupport() {
    const text = document.getElementById("support-text").value.trim();
    if (!text) { toast("Введите текст", "error"); return; }
    try { await apiCall("/api/support", { topic: selectedTopic, text }); toast("✅ Отправлено", "success"); document.getElementById("support-text").value = ""; closeModal("support-modal"); }
    catch (e) { toast(e.message, "error"); }
}

/* DAILY */
async function claimDaily() {
    const btn = document.getElementById("daily-btn");
    btn.disabled = true;
    const before = currentUser.balance;
    try {
        const r = await apiCall("/api/daily");
        setBalance(r.balance, true, before);
        renderProfile(); renderLeaderboard();
        toast(`🎁 Бонус: +${r.reward} 🪙`, "success", 3500);
        hapticNotify("success");
    } catch (e) { toast(e.message, "error"); btn.disabled = false; }
}
function copyRef() {
    const link = document.getElementById("ref-link").textContent;
    navigator.clipboard.writeText(link).then(() => toast("📋 Скопировано", "success")).catch(() => toast("Не удалось", "error"));
}

/* МУЗЫКА */
const DEFAULT_TRACKS = [
    { id: "t1", name: "🌃 Neon Dreams", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", builtin: true },
    { id: "t2", name: "🚗 Midnight Drive", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", builtin: true },
    { id: "t3", name: "⚡ Cyber Pulse", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", builtin: true },
    { id: "t4", name: "🌅 Golden Sunset", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", builtin: true },
    { id: "t5", name: "🌌 Deep Space", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", builtin: true },
    { id: "t6", name: "💎 Lifeless Theme", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3", builtin: true },
];
let musicAudio = null, currentTrackId = null, musicPlaying = false, myTracks = [];

function loadMusicState() {
    try { const raw = localStorage.getItem(LS_MUSIC_KEY); if (raw) { const p = JSON.parse(raw); myTracks = Array.isArray(p.tracks) ? p.tracks : []; currentTrackId = p.current || null; } } catch (_) {}
    if (!currentTrackId && DEFAULT_TRACKS.length) currentTrackId = DEFAULT_TRACKS[0].id;
}
function initMusic() {
    if (!musicAudio) {
        musicAudio = new Audio(); musicAudio.loop = false; musicAudio.volume = 0.5;
        musicAudio.addEventListener("timeupdate", updateMusicProgress);
        musicAudio.addEventListener("ended", onMusicEnded);
        musicAudio.addEventListener("loadedmetadata", updateMusicProgress);
        musicAudio.addEventListener("play", () => { musicPlaying = true; updatePlayButtons(); });
        musicAudio.addEventListener("pause", () => { musicPlaying = false; updatePlayButtons(); });
    }
    bindMusicProgressBar(); renderMusicPlayer(); renderMyMusic(); renderMiniPlayer();
}
function bindMusicProgressBar() {
    const mainBar = document.getElementById("music-progress-click");
    const miniBar = document.getElementById("mini-progress-wrap");
    [mainBar, miniBar].forEach(el => {
        if (!el) return;
        el.addEventListener("click", (e) => {
            if (!musicAudio || !musicAudio.duration) return;
            const rect = el.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            musicAudio.currentTime = pct * musicAudio.duration;
            updateMusicProgress();
        });
    });
}
function saveMusic() { try { localStorage.setItem(LS_MUSIC_KEY, JSON.stringify({ tracks: myTracks, current: currentTrackId })); } catch (_) {} }
function allTracks() { return [...DEFAULT_TRACKS, ...myTracks]; }
function findTrack(id) { return allTracks().find(t => t.id === id); }
function fmtTime(s) { if (!s || isNaN(s)) return "0:00"; const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${String(sec).padStart(2, "0")}`; }
function renderMusicPlayer() {
    const track = findTrack(currentTrackId);
    const titleEl = document.getElementById("music-track-title");
    const subEl = document.getElementById("music-track-sub");
    const coverImg = document.getElementById("music-cover-img");
    if (!track) { if (titleEl) titleEl.textContent = "Выбери трек"; if (subEl) subEl.textContent = "Моя коллекция"; return; }
    if (titleEl) titleEl.textContent = track.name;
    if (subEl) subEl.textContent = track.builtin ? "Библиотека Lifeless" : "Мой трек";
    if (coverImg) coverImg.src = `https://placehold.co/400x400/1a0d3e/ffd700?text=${encodeURIComponent(track.name.split(" ")[0] || "🎵")}`;
    updatePlayButtons(); updateRepeatIcon();
}
function renderMiniPlayer() {
    const track = findTrack(currentTrackId);
    const titleEl = document.getElementById("mini-track-title");
    if (titleEl) titleEl.textContent = track ? track.name : "Выбери трек";
    updatePlayButtons();
}
function updatePlayButtons() {
    const useId = musicPlaying ? "#ic-pause" : "#ic-play-mini";
    ["mini-play-icon", "music-main-icon"].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = `<use href="${useId}"/>`; });
    const mini = document.getElementById("mini-player");
    const main = document.querySelector(".music-player-card");
    if (mini) mini.classList.toggle("playing", musicPlaying);
    if (main) main.classList.toggle("playing", musicPlaying);
    const eq = document.getElementById("mini-eq");
    if (eq) eq.classList.toggle("playing", musicPlaying);
}
function updateRepeatIcon() {
    const useId = state.musicRepeat === "one" ? "#ic-repeat-one" : "#ic-repeat";
    ["mini-repeat-icon", "music-repeat-icon"].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = `<use href="${useId}"/>`; });
    const mini = document.getElementById("mini-repeat-btn");
    const main = document.getElementById("music-repeat-btn");
    if (mini) mini.classList.toggle("active", state.musicRepeat !== "off");
    if (main) main.classList.toggle("active", state.musicRepeat !== "off");
}
function updateMusicProgress() {
    const bar = document.getElementById("music-progress-bar");
    const miniBar = document.getElementById("mini-progress-bar");
    const curTime = document.getElementById("music-current-time");
    const dur = document.getElementById("music-duration");
    if (!musicAudio) return;
    const pct = musicAudio.duration ? (musicAudio.currentTime / musicAudio.duration) * 100 : 0;
    if (bar) bar.style.width = pct + "%";
    if (miniBar) miniBar.style.width = pct + "%";
    if (curTime) curTime.textContent = fmtTime(musicAudio.currentTime);
    if (dur) dur.textContent = fmtTime(musicAudio.duration);
}
function toggleMusic() {
    const track = findTrack(currentTrackId);
    if (!track) return;
    if (musicPlaying) { musicAudio.pause(); }
    else {
        if (musicAudio.src !== track.url) musicAudio.src = track.url;
        musicAudio.play().catch(() => { toast("Не удалось воспроизвести", "error"); });
    }
    haptic("light");
}
function musicPrev() {
    const tracks = allTracks(); if (!tracks.length) return;
    let idx = tracks.findIndex(t => t.id === currentTrackId);
    if (state.musicShuffle) idx = Math.floor(Math.random() * tracks.length);
    else idx = (idx - 1 + tracks.length) % tracks.length;
    currentTrackId = tracks[idx].id;
    const wasPlaying = musicPlaying;
    if (wasPlaying) { musicAudio.pause(); }
    renderMusicPlayer(); renderMiniPlayer();
    if (wasPlaying) setTimeout(() => toggleMusic(), 50);
    else saveMusic();
}
function musicNext() {
    const tracks = allTracks(); if (!tracks.length) return;
    let idx = tracks.findIndex(t => t.id === currentTrackId);
    if (state.musicShuffle) {
        let next; do { next = Math.floor(Math.random() * tracks.length); } while (tracks.length > 1 && next === idx);
        idx = next;
    } else idx = (idx + 1) % tracks.length;
    currentTrackId = tracks[idx].id;
    const wasPlaying = musicPlaying;
    if (wasPlaying) musicAudio.pause();
    renderMusicPlayer(); renderMiniPlayer();
    if (wasPlaying) setTimeout(() => toggleMusic(), 50);
    else saveMusic();
}
function musicShuffle() {
    state.musicShuffle = !state.musicShuffle;
    toast(state.musicShuffle ? "🔀 Перемешать: вкл" : "🔀 Перемешать: выкл", "info", 1500);
    haptic("light");
    document.querySelectorAll('[onclick="musicShuffle()"]').forEach(el => el.classList.toggle("active", state.musicShuffle));
}
function musicToggleRepeat() {
    if (state.musicRepeat === "off") state.musicRepeat = "all";
    else if (state.musicRepeat === "all") state.musicRepeat = "one";
    else state.musicRepeat = "off";
    updateRepeatIcon();
    const labels = { off: "🔁 Повтор: выкл", all: "🔁 Повтор: всё", one: "🔂 Повтор: один" };
    toast(labels[state.musicRepeat], "info", 1500); haptic("light");
}
function onMusicEnded() {
    if (state.musicRepeat === "one") { musicAudio.currentTime = 0; musicAudio.play(); }
    else musicNext();
}
function renderMyMusic() {
    const box = document.getElementById("music-my-list");
    if (!box) return;
    const all = [...DEFAULT_TRACKS, ...myTracks];
    box.innerHTML = all.map(t => `<div class="music-item ${t.id === currentTrackId ? 'active' : ''}" onclick="selectMusic('${t.id}')"><span class="music-item-emoji">🎵</span><span class="music-item-name">${escapeHtml(t.name)}</span>${!t.builtin ? `<button class="music-item-del" onclick="event.stopPropagation();deleteTrack('${t.id}')">✕</button>` : ''}</div>`).join("");
}
function selectMusic(id) {
    const track = findTrack(id); if (!track) return;
    currentTrackId = id;
    const wasPlaying = musicPlaying;
    if (wasPlaying) musicAudio.pause();
    renderMusicPlayer(); renderMiniPlayer();
    if (wasPlaying) setTimeout(() => toggleMusic(), 50);
    renderMyMusic(); saveMusic(); haptic("light");
}
function openMusicPicker() { renderMusicLibrary(); document.getElementById("music-modal").classList.remove("hidden"); }
function renderMusicLibrary() {
    const box = document.getElementById("music-list"); if (!box) return;
    const query = (document.getElementById("music-search")?.value || "").toLowerCase();
    const all = [...DEFAULT_TRACKS, ...myTracks].filter(t => t.name.toLowerCase().includes(query));
    if (!all.length) { box.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim)">Ничего не найдено</div>`; return; }
    box.innerHTML = all.map(t => `<button class="music-item ${t.id === currentTrackId ? 'active' : ''}" onclick="selectMusic('${t.id}');closeModal('music-modal')"><span class="music-item-emoji">🎵</span><span class="music-item-name">${escapeHtml(t.name)}</span>${!t.builtin ? '<span style="color:var(--gold);font-size:11px">моё</span>' : ''}</button>`).join("");
}
function openAddMusicModal() {
    document.getElementById("add-music-url").value = "";
    document.getElementById("add-music-name").value = "";
    document.getElementById("add-music-modal").classList.remove("hidden");
}
function submitAddMusic() {
    const url = document.getElementById("add-music-url").value.trim();
    const name = document.getElementById("add-music-name").value.trim() || "Мой трек";
    if (!url || !url.startsWith("http")) { toast("Введите корректную ссылку", "error"); return; }
    const id = "my_" + Date.now();
    myTracks.push({ id, name, url, builtin: false });
    saveMusic(); renderMyMusic(); closeModal("add-music-modal"); toast("✅ Трек добавлен", "success");
}
function deleteTrack(id) {
    myTracks = myTracks.filter(t => t.id !== id);
    if (currentTrackId === id) { currentTrackId = DEFAULT_TRACKS[0].id; if (musicPlaying) { musicAudio.pause(); } }
    saveMusic(); renderMyMusic(); renderMusicPlayer(); renderMiniPlayer(); toast("Удалено", "info");
}

/* СТАРТ */
if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", bootstrap);
else bootstrap();