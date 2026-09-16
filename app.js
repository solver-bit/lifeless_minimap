/* LIFELESS SHOP · v15 — универсальные платежи через tg.openInvoice */
const FORCE_DEMO = false;

let tg = window.Telegram?.WebApp;
const DEMO = FORCE_DEMO || !tg?.initData;

if (!tg) {
    tg = {
        initData: "", initDataUnsafe: { user: { id: 0, first_name: "Гость", username: "guest" } },
        expand: () => {}, close: () => {}, showPopup: (o) => alert(o.message || o.title || ""),
        openTelegramLink: (u) => window.open(u, "_blank"), openLink: (u) => window.open(u, "_blank"),
        sendData: () => {}, HapticFeedback: { impactOccurred: () => {}, notificationOccurred: () => {} },
    };
} else {
    try { tg.expand(); } catch (_) {}
    tg.setHeaderColor?.("#06060f");
    tg.setBackgroundColor?.("#06060f");
}

const API_BASE = location.origin;
const BOT_USERNAME = "Solver_Life_bot";
const BASE_URL = location.origin + "/miniapp/assets";
const LOTTIE_URLS = {
    coin:  `${BASE_URL}/finance-management.json`,
    cat:   `${BASE_URL}/Loadercat.json`,
    about: `${BASE_URL}/Businessplan.json`,
};

const TG_USER_ID = tg.initDataUnsafe?.user?.id || 0;
const LS_MUSIC_KEY = `lifeless_music_v15_u${TG_USER_ID}`;
const LS_PETS_KEY  = `lifeless_pets_v15_u${TG_USER_ID}`;
const LS_DECOR_KEY = `lifeless_decor_v15_u${TG_USER_ID}`;

// ============================================================
//                     СОСТОЯНИЕ
// ============================================================

const defaultUser = {
    id: 0, first_name: "", last_name: "", username: "", avatar_url: "",
    balance: 0, cases_opened: 0, referrals: 0, stars_spent: 0,
    total_deposited: 0, referral_revshare: 0,
    rank: 1, total_users: 1, ref_link: "",
    is_admin: false, happy_hours: false, happy_seconds_left: 0,
    name_color: "", frame_id: "", premium: false, free_spins: 0,
    last_free_case: "1970-01-01 00:00:00",
    last_free_wheel: "1970-01-01 00:00:00",
    owned_pets: [], pet_pos: "br", pet_size: "md", pet_in_header: false,
    vip_tier: "none", vip_name: "Игрок", vip_emoji: "👤", vip_color: "#8a8aa0",
    vip_rtp_bonus: 0, vip_discount: 0,
    streak_day: 1, streak_can_claim: false,
    quests: {},
};

let currentUser = { ...defaultUser };

const state = {
    spinning: false, rolling: false, caseOpening: false,
    saperActive: false, saperSafe: 0, saperTotal: 0, saperConfig: null,
    saperMode: "coins",
    currentShopCat: "coins", currentCaseCat: "coins", currentDecorTab: "color",
    petPos: "br", petSize: "md", petInHeader: false,
    petLottie: null, sidePetLottie: null, headerPetLottie: null, previewLottie: null,
    musicShuffle: false, musicRepeat: "off",
    coinPlaying: false, coinRotation: 0,
};

const lottieInstances = {};

let DECOR_PRICES = null;   // ← грузим с сервера
let PETS_LIST = null;      // ← грузим с сервера

// ============================================================
//                     УТИЛИТЫ
// ============================================================

function haptic(t = "light") { try { tg.HapticFeedback?.impactOccurred(t); } catch (_) {} }
function hapticNotify(t = "success") { try { tg.HapticFeedback?.notificationOccurred(t); } catch (_) {} }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
        el.style.transition = "opacity 0.5s ease, transform 0.5s cubic-bezier(0.32,0.72,0,1)";
    }, ms);
    setTimeout(() => el.remove(), ms + 600);
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
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function makeInitialsAvatar(f, l, u) {
    let letters = "";
    if (f) letters += f.charAt(0);
    if (l) letters += l.charAt(0);
    if (!letters) letters = (u || "?").charAt(0);
    letters = letters.toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#00aaff"/><stop offset="50%" stop-color="#c04cff"/><stop offset="100%" stop-color="#ffd700"/></linearGradient></defs><rect width="200" height="200" fill="#06060f"/><circle cx="100" cy="100" r="90" fill="url(#g)" opacity="0.9"/><text x="100" y="100" font-family="-apple-system,sans-serif" font-size="90" font-weight="900" fill="#06060f" text-anchor="middle" dominant-baseline="central">${escapeHtml(letters)}</text></svg>`;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// ============================================================
//                     API
// ============================================================

async function apiCall(path, body = null) {
    const headers = { "X-Init-Data": tg.initData || "" };
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API_BASE}${path}`, {
        method: body ? "POST" : "GET",
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.detail || "Ошибка запроса");
        err.status = res.status;
        throw err;
    }
    return data;
}

async function refreshMe() {
    try {
        const me = await apiCall("/api/me");
        Object.assign(currentUser, me);
        return me;
    } catch (e) {
        console.error("refreshMe:", e);
        return null;
    }
}

async function loadShopPrices() {
    try {
        if (!DECOR_PRICES) {
            const d = await apiCall("/api/shop/decor");
            DECOR_PRICES = d.decor;
        }
        if (!PETS_LIST) {
            const p = await apiCall("/api/shop/pets");
            PETS_LIST = p.pets;
        }
    } catch (e) { console.error("shop prices:", e); }
}

// ============================================================
//    УНИВЕРСАЛЬНЫЙ ПЛАТЁЖ ЧЕРЕЗ tg.openInvoice
// ============================================================

async function startStarPayment(kind, params, onSuccess) {
    if (DEMO || !tg.openInvoice) {
        toast("Оплата доступна только в Telegram", "info");
        return;
    }
    haptic("medium");

    let prep;
    try {
        prep = await apiCall("/api/invoice/prepare", { kind, params });
    } catch (e) {
        toast(e.message || "Не удалось создать инвойс", "error");
        return;
    }

    tg.openInvoice(prep.invoice_link, async (status) => {
        if (status === "cancelled") { toast("Оплата отменена", "info"); return; }
        if (status === "failed") { toast("Оплата не прошла", "error"); hapticNotify("error"); return; }
        if (status !== "paid") return;

        toast("✅ Оплата прошла! Обрабатываем...", "success", 4000);
        hapticNotify("success");

        let result = null;
        for (let i = 0; i < 12; i++) {
            await sleep(700);
            try {
                const claim = await apiCall("/api/invoice/claim", { session_id: prep.session_id });
                if (claim.status === "paid" && claim.result) { result = claim.result; break; }
                if (claim.status === "pending") continue;
            } catch (e) { /* pending */ }
        }

        await refreshMe();
        renderProfile();
        renderLeaderboard();
        renderDropsFeed();

        if (!result) {
            toast("Обработка задерживается — проверь баланс через минуту", "info", 5000);
            return;
        }
        if (onSuccess) onSuccess(result);
    });
}

// ============================================================
//                     ПРИЗЫ КЕЙСОВ
// ============================================================

const CASE_PRIZES = [
    { kind: "empty",     emoji: "💨", label: "Пусто",      weight: 25, rarity: "common" },
    { kind: "coins", value: 25,   emoji: "🪙", label: "25",  weight: 18, rarity: "common" },
    { kind: "coins", value: 50,   emoji: "🪙", label: "50",  weight: 15, rarity: "common" },
    { kind: "coins", value: 100,  emoji: "💰", label: "100", weight: 12, rarity: "uncommon" },
    { kind: "coins", value: 250,  emoji: "💰", label: "250", weight: 10, rarity: "uncommon" },
    { kind: "coins", value: 500,  emoji: "💵", label: "500", weight: 8,  rarity: "rare" },
    { kind: "coins", value: 1000, emoji: "💎", label: "1K",  weight: 5,  rarity: "epic" },
    { kind: "coins", value: 2000, emoji: "💎", label: "2K",  weight: 2,  rarity: "epic" },
    { kind: "gift", gift: "heart",  emoji: "❤️", label: "Сердце",  weight: 3,  rarity: "rare" },
    { kind: "gift", gift: "bear",   emoji: "🧸", label: "Медведь", weight: 1.5,rarity: "rare" },
    { kind: "gift", gift: "rose",   emoji: "🌹", label: "Роза",    weight: 0.7,rarity: "epic" },
    { kind: "gift", gift: "rocket", emoji: "🚀", label: "Ракета",  weight: 0.3,rarity: "legendary" },
    { kind: "gift", gift: "ring",   emoji: "💍", label: "Кольцо",  weight: 0.1,rarity: "legendary" },
];

const MULT_TO_RARITY = [
    { rarity: "common" }, { rarity: "common" }, { rarity: "uncommon" },
    { rarity: "rare" },   { rarity: "epic" },   { rarity: "legendary" },
];

function pickRandomPrize() {
    const total = CASE_PRIZES.reduce((s, p) => s + p.weight, 0);
    let r = Math.random() * total;
    for (const p of CASE_PRIZES) if ((r -= p.weight) <= 0) return p;
    return CASE_PRIZES[0];
}
function pickPrizeByRarity(rarity) {
    const pool = CASE_PRIZES.filter(p => p.rarity === rarity);
    if (!pool.length) return CASE_PRIZES[0];
    return pool[Math.floor(Math.random() * pool.length)];
}
function makeReelItemHTML(prize) {
    return `<div class="ci-icon">${prize.emoji}</div><div class="ci-label">${escapeHtml(prize.label)}</div>`;
}

// ============================================================
//                     КОЛЁСА
// ============================================================

const WHEEL_CONFIG = {
    "wheel": {
        cost: 200,
        values: [0, 100, 150, 200, 300, 500, 1000, 2000],
        emoji:  ["💨", "🪙", "🪙", "💰", "💰", "💎", "💎", "👑"],
        labels: ["0", "100", "150", "200", "300", "500", "1K", "2K"],
    },
    "wheel-free": {
        cost: 0,
        values: [0, 10, 25, 50, 100, 200, 500],
        emoji:  ["💨", "🪙", "🪙", "💰", "💰", "💎", "👑"],
        labels: ["0", "10", "25", "50", "100", "200", "500"],
    },
    "wheel-vip": {
        cost: 50,  // в звёздах
        values: [0, 200, 500, 1000, 2000, 5000, 10000],
        emoji:  ["💨", "💰", "💰", "💎", "👑", "🚀", "🪐"],
        labels: ["0", "200", "500", "1K", "2K", "5K", "10K"],
    },
};

// ============================================================
//                     LOTTIE
// ============================================================

function loadLottie(container, url, id) {
    if (typeof lottie === "undefined") return null;
    if (id && lottieInstances[id]) {
        lottieInstances[id].destroy();
        delete lottieInstances[id];
    }
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

// ============================================================
//                     ПИТОМЦЫ / ДЕКОР
// ============================================================

function loadPetsState() {
    try {
        const raw = localStorage.getItem(LS_PETS_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            state.petPos = p.pos || "br";
            state.petSize = p.size || "md";
            state.petInHeader = p.inHeader || false;
        }
    } catch (_) {}
}
function savePetsState() {
    try {
        localStorage.setItem(LS_PETS_KEY, JSON.stringify({
            pos: state.petPos, size: state.petSize, inHeader: state.petInHeader,
        }));
    } catch (_) {}
}

function hasPet(id) {
    return Array.isArray(currentUser.owned_pets) && currentUser.owned_pets.includes(id);
}

const NAME_COLORS_META = {
    "":        { name: "Обычный", cls: "" },
    "gold":    { name: "Золотой", cls: "name-color-gold" },
    "blue":    { name: "Синий", cls: "name-color-blue" },
    "pink":    { name: "Розовый", cls: "name-color-pink" },
    "purple":  { name: "Фиолетовый", cls: "name-color-purple" },
    "green":   { name: "Зелёный", cls: "name-color-green" },
    "red":     { name: "Красный", cls: "name-color-red" },
    "cyan":    { name: "Циан", cls: "name-color-cyan" },
    "rainbow": { name: "Радужный", cls: "name-color-rainbow" },
};
const FRAMES_META = {
    "":          { name: "Нет", cls: "" },
    "gold":      { name: "Золотая", cls: "frame-gold" },
    "blue":      { name: "Синяя", cls: "frame-blue" },
    "neon":      { name: "Неоновая", cls: "frame-neon" },
    "ocean":     { name: "Океан", cls: "frame-ocean" },
    "fire":      { name: "Огненная", cls: "frame-fire" },
    "sunset":    { name: "Закат", cls: "frame-sunset" },
    "legendary": { name: "Легендарная", cls: "frame-legendary" },
    "royal":     { name: "Королевская", cls: "frame-royal" },
};

function loadDecorState() {
    try {
        const raw = localStorage.getItem(LS_DECOR_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            state.nameColor = p.color || "";
            state.frameId = p.frame || "";
        }
    } catch (_) {}
}
function saveDecorState() {
    try {
        localStorage.setItem(LS_DECOR_KEY, JSON.stringify({ color: state.nameColor, frame: state.frameId }));
    } catch (_) {}
}

// ============================================================
//                     СПРАВОЧНИКИ
// ============================================================

const COIN_CASES = [
    { id: "10",    name: "Пыль",   price: 10,    emoji: "📦", tag: "Старт",     preview: ["💨","🪙","❤️"] },
    { id: "50",    name: "Пепел",  price: 50,    emoji: "💼", tag: "Обычный",   preview: ["🪙","❤️","🧸"] },
    { id: "250",   name: "Мелл",   price: 250,   emoji: "🔥", tag: "Хайроллер", preview: ["❤️","🌹","🧸"] },
    { id: "1000",  name: "Telega", price: 1000,  emoji: "💎", tag: "Редкий",    preview: ["🌹","🚀","💍"] },
    { id: "5000",  name: "Оникс",  price: 5000,  emoji: "👑", tag: "Элита",     preview: ["🚀","💍","🧸"] },
    { id: "10000", name: "Бездна", price: 10000, emoji: "🌌", tag: "ТОП",       preview: ["💍","🚀","👑"] },
];

const STAR_CASES = [
    { id: "1",   name: "Фарм",    price: 1,   emoji: "🌱", tag: "1⭐",   preview: ["🪙","🪙","❤️"] },
    { id: "3",   name: "Базовый", price: 3,   emoji: "🎯", tag: "3⭐",   preview: ["🪙","❤️","🧸"] },
    { id: "5",   name: "Лёгкий",  price: 5,   emoji: "🎈", tag: "5⭐",   preview: ["❤️","🧸","🌹"] },
    { id: "10",  name: "Удача",   price: 10,  emoji: "🍀", tag: "10⭐",  preview: ["🧸","🌹","🚀"] },
    { id: "25",  name: "Везучий", price: 25,  emoji: "🎪", tag: "25⭐",  preview: ["🌹","🚀","💍"] },
    { id: "50",  name: "Подарки", price: 50,  emoji: "🎁", tag: "50⭐",  preview: ["🚀","💍","👑"] },
    { id: "75",  name: "Победа",  price: 75,  emoji: "🏆", tag: "75⭐",  preview: ["💍","🚀","👑"] },
    { id: "100", name: "Фортуна", price: 100, emoji: "⭐", tag: "100⭐", preview: ["💍","🚀","👑"] },
    { id: "250", name: "Джекпот", price: 250, emoji: "💥", tag: "250⭐", preview: ["💍","🚀","👑"] },
    { id: "500", name: "NFT",     price: 500, emoji: "🪐", tag: "500⭐", preview: ["🪐","💍","🚀"] },
];

const VIP_CASES = [
    { id: "vip_15", name: "Особый VIP",    price: 15, emoji: "🎩", tag: "15⭐", preview: ["🧸","🌹","💎"] },
    { id: "vip_50", name: "VIP Владельца", price: 50, emoji: "👑", tag: "50⭐", preview: ["🚀","💍","🪐"] },
];

// ============================================================
//                     SIDE MENU
// ============================================================

function openSideMenu() {
    document.getElementById("side-menu").classList.add("open");
    document.getElementById("side-overlay").classList.add("open");
    haptic("light");
}
function closeSideMenu() {
    document.getElementById("side-menu").classList.remove("open");
    document.getElementById("side-overlay").classList.remove("open");
}

function bindSideMenu() {
    document.querySelectorAll(".side-item[data-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
            const tab = btn.dataset.tab;
            if (!tab) return;
            document.querySelectorAll(".side-item").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            switchTab(tab);
            closeSideMenu();
        });
    });
    const sideSupportBtn = document.getElementById("side-support-btn");
    if (sideSupportBtn) {
        sideSupportBtn.addEventListener("click", () => {
            closeSideMenu();
            switchTab("home");
            document.querySelectorAll(".side-item").forEach(b => b.classList.remove("active"));
            const homeBtn = document.querySelector('.side-item[data-tab="home"]');
            if (homeBtn) homeBtn.classList.add("active");
            openSupport();
        });
    }
}

function renderSideMenu() {
    const u = tg.initDataUnsafe?.user || {};
    const avatar = document.getElementById("side-avatar");
    if (avatar) {
        const src = currentUser.avatar_url || makeInitialsAvatar(u.first_name, u.last_name, u.username);
        avatar.src = src;
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

// ============================================================
//                     ПРОФИЛЬ
// ============================================================

function renderProfile() {
    const u = tg.initDataUnsafe?.user || {};

    const avatarEl = document.getElementById("profile-avatar");
    if (avatarEl) {
        const src = currentUser.avatar_url || makeInitialsAvatar(u.first_name, u.last_name, u.username);
        avatarEl.src = src;
        avatarEl.className = "profile-avatar";
        const frameId = currentUser.frame_id || state.frameId;
        const frame = FRAMES_META[frameId];
        if (frame && frame.cls) avatarEl.classList.add(frame.cls);
    }

    const nameEl = document.getElementById("profile-name");
    if (nameEl) {
        nameEl.textContent = [u.first_name || currentUser.first_name, u.last_name || currentUser.last_name].filter(Boolean).join(" ") || "Игрок";
        nameEl.className = "profile-name";
        const colorId = currentUser.name_color || state.nameColor;
        const color = NAME_COLORS_META[colorId];
        if (color && color.cls) nameEl.classList.add(color.cls);
        if (currentUser.premium) nameEl.textContent = "⭐ " + nameEl.textContent;
    }

    const unEl = document.getElementById("profile-username");
    if (unEl) unEl.textContent = (u.username || currentUser.username) ? `@${u.username || currentUser.username}` : `ID: ${currentUser.id}`;

    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setText("profile-badge", `#${currentUser.rank} из ${currentUser.total_users}`);
    setText("profile-cases", currentUser.cases_opened);
    setText("profile-stars", currentUser.stars_spent);
    setText("profile-refs", currentUser.referrals);
    setText("profile-vip", `${currentUser.vip_emoji} ${currentUser.vip_name}`);
    setText("ref-link", currentUser.ref_link || "—");
    setText("home-cases", currentUser.cases_opened);
    setText("home-wagered", formatNum(currentUser.balance || 0));
    setText("home-best", formatNum(currentUser.cases_opened || 0));

    const happy = document.getElementById("happy-banner");
    if (happy) happy.style.display = currentUser.happy_hours ? "flex" : "none";

    renderDailyStreak();
    renderQuests();
}

// ============================================================
//                     СТРИК
// ============================================================

function renderDailyStreak() {
    const banner = document.getElementById("daily-streak");
    if (!banner) return;
    const day = currentUser.streak_day || 1;
    const canClaim = currentUser.streak_can_claim;

    const rewards = [15, 25, 40, 60, 85, 115, 150];
    const reward = rewards[Math.min(day - 1, rewards.length - 1)];

    banner.innerHTML = `
        <div class="streak-header">
            <div class="streak-title">🔥 Стрик · день ${day}</div>
            <div class="streak-days">${rewards.map((r, i) => `<span class="${i + 1 === day ? 'active' : ''}">${i + 1}</span>`).join("")}</div>
        </div>
        <div class="streak-reward">+${reward} 🪙</div>
        <button class="streak-btn" ${canClaim ? '' : 'disabled'} onclick="claimStreak()">
            ${canClaim ? 'Забрать' : 'Уже получено'}
        </button>
    `;
}

async function claimStreak() {
    if (!currentUser.streak_can_claim) return;
    haptic("medium");
    try {
        const r = await apiCall("/api/streak/claim", {});
        setBalance(r.balance, true);
        toast(`🔥 День ${r.day}: +${r.reward} 🪙`, "success", 3500);
        hapticNotify("success");
        await refreshMe();
        renderProfile();
        renderDropsFeed();
    } catch (e) {
        toast(e.message, "error");
    }
}

// ============================================================
//                     КВЕСТЫ
// ============================================================

function renderQuests() {
    const box = document.getElementById("quests-list");
    if (!box) return;
    const quests = currentUser.quests || {};
    const ids = Object.keys(quests);
    if (!ids.length) { box.innerHTML = ""; return; }

    box.innerHTML = ids.map(qid => {
        const q = quests[qid];
        const pct = Math.min(100, Math.floor((q.progress / q.target) * 100));
        const done = q.progress >= q.target && !q.claimed;
        const claimed = q.claimed;
        return `
            <div class="quest-item ${claimed ? 'claimed' : ''} ${done ? 'done' : ''}">
                <div class="quest-emoji">${q.emoji}</div>
                <div class="quest-info">
                    <div class="quest-title">${escapeHtml(q.title)}</div>
                    <div class="quest-progress">
                        <div class="quest-bar" style="width:${pct}%"></div>
                    </div>
                    <div class="quest-meta">${q.progress}/${q.target} · +${q.reward} 🪙</div>
                </div>
                ${claimed ? '<div class="quest-check">✓</div>' : done ? `<button class="quest-btn" onclick="claimQuest('${qid}')">Забрать</button>` : ''}
            </div>
        `;
    }).join("");
}

async function claimQuest(qid) {
    haptic("medium");
    try {
        const r = await apiCall("/api/quests/claim", { quest_id: qid });
        setBalance(r.balance, true);
        toast(`✅ +${r.reward} 🪙`, "success");
        hapticNotify("success");
        await refreshMe();
        renderProfile();
        renderDropsFeed();
    } catch (e) {
        toast(e.message, "error");
    }
}

// ============================================================
//                     ПИТОМЕЦ (активный)
// ============================================================

function renderActivePet() {
    const positions = ["tl", "tr", "bl", "br"];
    positions.forEach(p => {
        const el = document.getElementById(`profile-pet-${p}`);
        if (el) { el.style.display = "none"; el.innerHTML = ""; }
    });
    const headerSlot = document.getElementById("header-pet-slot");
    if (headerSlot) { headerSlot.style.display = "none"; headerSlot.innerHTML = ""; }
    if (state.petLottie) { state.petLottie.destroy(); state.petLottie = null; }
    if (state.headerPetLottie) { state.headerPetLottie.destroy(); state.headerPetLottie = null; }
    if (!hasPet("cat")) return;

    const inHeader = currentUser.pet_in_header ?? state.petInHeader;
    const pos = currentUser.pet_pos || state.petPos;
    const size = currentUser.pet_size || state.petSize;

    if (inHeader) {
        if (headerSlot) {
            headerSlot.style.display = "block";
            setTimeout(() => { state.headerPetLottie = loadLottie(headerSlot, LOTTIE_URLS.cat, "headerPet"); }, 50);
        }
    } else {
        const slot = document.getElementById(`profile-pet-${pos}`);
        if (slot) {
            slot.style.display = "block";
            slot.className = `pet-slot-abs pet-pos-${pos} pet-size-${size}`;
            setTimeout(() => { state.petLottie = loadLottie(slot, LOTTIE_URLS.cat, "profilePet"); }, 50);
        }
    }
    renderSideMenu();
}

// ============================================================
//                     БАЛАНС
// ============================================================

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
        ["coins", "profile-balance", "side-balance-val"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = v.toLocaleString("ru-RU");
        });
    }
}

// ============================================================
//                     ЛИДЕРБОРД
// ============================================================

async function renderLeaderboard() {
    const box = document.getElementById("leaderboard-list");
    if (!box) return;
    try {
        const data = await apiCall("/api/leaderboard");
        const top = data.top || [];
        const me = data.me;
        let html = top.map(u => renderLeaderRow(u)).join("");
        if (me) html += `<div class="leader-sep"></div>` + renderLeaderRow(me);
        box.innerHTML = html;
    } catch (e) { console.error("leaderboard:", e); }
}

function renderLeaderRow(u) {
    const frameCls = u.frame_id ? `frame-${u.frame_id}` : "";
    const nameCls = u.name_color ? `name-color-${u.name_color}` : "";
    const premiumBadge = u.premium ? `<span class="premium-badge">⭐</span>` : "";
    const rankCls = u.rank === 1 ? "gold" : u.rank === 2 ? "silver" : u.rank === 3 ? "bronze" : "";
    const avatar = u.avatar_url || makeInitialsAvatar(null, null, u.username || "Anon");
    return `
        <div class="leader-row ${u.is_me ? 'me' : ''}">
            <div class="leader-rank ${rankCls}">#${u.rank}</div>
            <img class="leader-avatar ${frameCls}" src="${avatar}" alt="">
            <div class="leader-name ${nameCls}">${premiumBadge}${escapeHtml(u.username)}</div>
            <div class="leader-balance">${u.balance.toLocaleString("ru-RU")} 🪙</div>
        </div>`;
}

async function renderDropsFeed() {
    const box = document.getElementById("drops-feed");
    if (!box) return;
    try {
        const data = await apiCall("/api/drops");
        const drops = data.drops || [];
        if (!drops.length) {
            box.innerHTML = `<div class="drop-row"><div class="drop-text">Пока пусто. Открой первый кейс!</div></div>`;
            return;
        }
        box.innerHTML = drops.map(d => `
            <div class="drop-row">
                <div class="drop-icon">🎉</div>
                <div class="drop-text">${escapeHtml(d.label)}</div>
                <div class="drop-value win">+${d.delta.toLocaleString("ru-RU")} 🪙</div>
            </div>`).join("");
    } catch (e) { console.error("drops:", e); }
}

async function renderDropsGlobal() {
    const box = document.getElementById("drops-global");
    if (!box) return;
    try {
        const data = await apiCall("/api/drops/global");
        const drops = data.drops || [];
        if (!drops.length) {
            box.innerHTML = `<div class="drop-row"><div class="drop-text">Скоро здесь появятся победители...</div></div>`;
            return;
        }
        box.innerHTML = drops.map(d => `
            <div class="drop-row">
                <div class="drop-icon">🔥</div>
                <div class="drop-text"><b>@${escapeHtml(d.username)}</b> · ${escapeHtml(d.label)}</div>
                <div class="drop-value win">+${d.delta.toLocaleString("ru-RU")} 🪙</div>
            </div>`).join("");
    } catch (e) { console.error("drops global:", e); }
}

async function renderTopToday() {
    try {
        const data = await apiCall("/api/leaderboard");
        const winner = data.top && data.top[0];
        const nameEl = document.getElementById("top-today-name");
        const balEl = document.getElementById("top-today-balance");
        if (nameEl && winner) nameEl.textContent = winner.username;
        if (balEl && winner) balEl.textContent = `${winner.balance.toLocaleString("ru-RU")} 🪙`;
    } catch (_) {}
}

// ============================================================
//                     НАВИГАЦИЯ
// ============================================================

function switchTab(tabId) {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    const el = document.getElementById(`tab-${tabId}`);
    if (el) el.classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
    document.querySelectorAll(".side-item[data-tab]").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === tabId));
    if (tabId !== "games") closeGameView();
    if (tabId === "about" && !lottieInstances.about && typeof lottie !== "undefined") {
        const slot = document.getElementById("about-lottie");
        if (slot) lottieInstances.about = loadLottie(slot, LOTTIE_URLS.about, "about");
    }
    haptic("light");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchShopCat(cat) {
    state.currentShopCat = cat;
    document.querySelectorAll("#tab-shop .cat-tab").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
    document.querySelectorAll("#tab-shop .shop-panel").forEach(p => p.classList.remove("active"));
    const panel = document.getElementById(`shop-panel-${cat}`);
    if (panel) panel.classList.add("active");
    haptic("light");
}

function switchCaseCat(cat) {
    state.currentCaseCat = cat;
    document.querySelectorAll("#tab-cases .cat-tab").forEach(b => b.classList.toggle("active", b.dataset.cat === cat));
    document.querySelectorAll("#tab-cases .cases-panel").forEach(p => p.classList.remove("active"));
    const panel = document.getElementById(`cases-panel-${cat}`);
    if (panel) panel.classList.add("active");
    haptic("light");
}

// ============================================================
//                     ИГРЫ
// ============================================================

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

// ============================================================
//                     КАРУСЕЛЬ
// ============================================================

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

function startCarouselAuto() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(() => showSlide(currentSlide + 1), 6500);
}

function bindCarouselSwipe() {
    const el = document.getElementById("carousel");
    if (!el) return;
    let startX = 0, dx = 0, isDragging = false, startT = 0;
    const onStart = (e) => {
        const t = e.touches ? e.touches[0] : e;
        startX = t.clientX; dx = 0; isDragging = true; startT = Date.now();
        if (carouselTimer) clearInterval(carouselTimer);
    };
    const onMove = (e) => {
        if (!isDragging) return;
        const t = e.touches ? e.touches[0] : e;
        dx = t.clientX - startX;
    };
    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        const dt = Date.now() - startT;
        const speed = Math.abs(dx) / Math.max(dt, 1);
        if (Math.abs(dx) > 50 || (Math.abs(dx) > 20 && speed > 0.5)) {
            showSlide(dx > 0 ? currentSlide - 1 : currentSlide + 1);
            haptic("light");
        }
        startCarouselAuto();
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
}

// ============================================================
//                     HAPPY TIMER
// ============================================================

function startHappyTimer() {
    const el = document.getElementById("happy-timer");
    if (!el) return;

    function update() {
        let left = currentUser.happy_seconds_left || 0;

        if (currentUser.happy_hours && left > 0) {
            const hh = Math.floor(left / 3600);
            const mm = Math.floor((left % 3600) / 60);
            el.textContent = `осталось ${hh}ч ${String(mm).padStart(2, "0")}м`;
        } else {
            const now = new Date();
            const h = now.getHours(), m = now.getMinutes();
            const target = h < 20 ? 20 : 32;
            left = (target * 60) - (h * 60 + m);
            const hh = Math.floor(left / 60), mm = left % 60;
            el.textContent = `через ${hh}ч ${String(mm).padStart(2, "0")}м`;
        }

        // локальный декремент
        if (currentUser.happy_hours && currentUser.happy_seconds_left > 0) {
            currentUser.happy_seconds_left = Math.max(0, currentUser.happy_seconds_left - 60);
        }
    }
    update();
    setInterval(update, 60000);
}

// ============================================================
//                     КЕЙСЫ — СБОРКА
// ============================================================

function buildCases() {
    const grid = document.getElementById("cases-grid");
    if (!grid) return;
    grid.innerHTML = COIN_CASES.map(c => `
        <button class="case-btn" data-case="${c.id}">
            <div class="case-tag">${c.tag}</div>
            <div class="case-icon">${c.emoji}</div>
            <div class="case-name">${c.name}</div>
            <div class="case-price">${c.price.toLocaleString("ru-RU")} 🪙</div>
            <div class="case-items-preview">${c.preview.map(p => `<span>${p}</span>`).join("")}</div>
        </button>`).join("");
    grid.querySelectorAll(".case-btn").forEach(btn => btn.addEventListener("click", () => openCase(btn.dataset.case)));
}

function buildStarCases() {
    const grid = document.getElementById("star-cases-grid");
    if (!grid) return;
    grid.innerHTML = STAR_CASES.map(c => `
        <button class="case-btn star" data-star="${c.id}">
            <div class="case-tag">${c.tag}</div>
            <div class="case-icon">${c.emoji}</div>
            <div class="case-name">${c.name}</div>
            <div class="case-price">${c.price} ⭐</div>
            <div class="case-items-preview">${c.preview.map(p => `<span>${p}</span>`).join("")}</div>
        </button>`).join("");
    grid.querySelectorAll(".case-btn").forEach(btn => btn.addEventListener("click", () => openStarCase(btn.dataset.star)));
}

function buildVipCases() {
    const grid = document.getElementById("vip-cases-grid");
    if (!grid) return;
    grid.innerHTML = VIP_CASES.map(c => `
        <button class="case-btn star" data-vip="${c.id}">
            <div class="case-tag">${c.tag}</div>
            <div class="case-icon">${c.emoji}</div>
            <div class="case-name">${c.name}</div>
            <div class="case-price">${c.price} ⭐</div>
            <div class="case-items-preview">${c.preview.map(p => `<span>${p}</span>`).join("")}</div>
        </button>`).join("");
    grid.querySelectorAll(".case-btn").forEach(btn => btn.addEventListener("click", () => openVipCase(btn.dataset.vip)));
}

// ============================================================
//                     МОНЕТНЫЕ КЕЙСЫ
// ============================================================

async function openCase(caseId) {
    if (state.caseOpening) return;
    const caseData = COIN_CASES.find(c => c.id === caseId);
    if (!caseData) return;
    if (currentUser.balance < caseData.price) {
        hapticNotify("error");
        showInsufficientBalance(caseData.price, currentUser.balance);
        return;
    }
    await runCaseAnimation(`Кейс «${caseData.name}»`, () => apiCall("/api/open_case", { case_id: caseId }));
    await refreshMe();
    renderProfile();
    renderLeaderboard();
    updateFreeCaseUI();
}

// ============================================================
//   ЗВЁЗДНЫЕ И VIP КЕЙСЫ
// ============================================================

function openStarCase(starId) {
    const caseData = STAR_CASES.find(c => c.id === starId);
    if (!caseData) return;
    startStarPayment("star_case", { stars: caseData.price }, (result) => {
        showStarCaseResult(caseData, result);
        refreshMe().then(() => { renderProfile(); renderLeaderboard(); renderDropsFeed(); });
    });
}

function showStarCaseResult(caseData, result) {
    const modal = document.getElementById("case-modal");
    const titleEl = document.getElementById("case-modal-title");
    const resEl = document.getElementById("case-modal-result");
    const reel = document.getElementById("case-reel");
    if (!modal || !resEl) return;

    if (reel) { reel.innerHTML = ""; reel.style.transform = "translate3d(0,0,0)"; }
    if (titleEl) titleEl.textContent = `⭐ «${caseData.name}» · ${caseData.price}⭐`;

    if (result.type === "gift") {
        resEl.innerHTML = `
            <div style="font-size:56px;margin-bottom:12px">${result.emoji}</div>
            <span style="color:#ffd700;text-shadow:0 0 30px currentColor;font-size:24px">🎁 ПОДАРОК!</span>
            <div style="margin-top:14px;font-size:22px;color:#fff">${escapeHtml(result.name)}</div>
            <div style="margin-top:6px;font-size:14px;color:#8a8aa0">Отправлен в Telegram</div>`;
        hapticNotify("success");
    } else {
        const reward = result.reward || 0;
        const cost = result.cost || caseData.price * 10;
        const profit = reward - cost;
        const profitColor = profit >= 0 ? "#22dd88" : "#ff3b5b";
        const profitSign = profit >= 0 ? "+" : "";
        resEl.innerHTML = `
            <div style="font-size:32px;margin-bottom:8px">${reward > 0 ? "🏆" : "💔"}</div>
            <span style="color:${reward > 0 ? '#ffd700' : '#ff3b5b'};text-shadow:0 0 30px currentColor;font-size:22px">${reward > 0 ? "ПОБЕДА!" : "Проигрыш"}</span>
            <div style="margin-top:14px;font-size:20px;color:#fff">+${reward.toLocaleString("ru-RU")} 🪙</div>
            <div style="margin-top:6px;font-size:15px;color:${profitColor}">Чистыми: <b>${profitSign}${profit.toLocaleString("ru-RU")}</b> 🪙</div>`;
        hapticNotify(reward > 0 ? "success" : "error");
    }

    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.add("hidden");
        if (resEl) resEl.innerHTML = "";
    }, 3500);
}

function openVipCase(vipId) {
    const caseData = VIP_CASES.find(c => c.id === vipId);
    if (!caseData) return;
    startStarPayment("vip_case", { vip_id: vipId }, (result) => {
        showVipCaseResult(caseData, result);
        refreshMe().then(() => { renderProfile(); renderLeaderboard(); renderDropsFeed(); });
    });
}

function showVipCaseResult(caseData, result) {
    const modal = document.getElementById("case-modal");
    const titleEl = document.getElementById("case-modal-title");
    const resEl = document.getElementById("case-modal-result");
    const reel = document.getElementById("case-reel");
    if (!modal || !resEl) return;

    if (reel) { reel.innerHTML = ""; reel.style.transform = "translate3d(0,0,0)"; }
    if (titleEl) titleEl.textContent = `${caseData.emoji} ${caseData.name}`;

    if (result.type === "gift") {
        resEl.innerHTML = `
            <div style="font-size:56px;margin-bottom:12px">${result.emoji}</div>
            <span style="color:#ffd700;text-shadow:0 0 30px currentColor;font-size:24px">🎁 ${escapeHtml(result.name)}</span>
            <div style="margin-top:14px;font-size:16px;color:#8a8aa0">Отправлен в Telegram</div>`;
    } else if (result.type === "nft") {
        resEl.innerHTML = `
            <div style="font-size:56px;margin-bottom:12px">🪐</div>
            <span style="color:#c04cff;text-shadow:0 0 30px currentColor;font-size:24px">NFT!</span>
            <div style="margin-top:14px;font-size:16px;color:#fff">Код: <b>${escapeHtml(result.code)}</b></div>
            <div style="margin-top:6px;font-size:13px;color:#8a8aa0">Свяжись с поддержкой</div>`;
    } else {
        resEl.innerHTML = `
            <div style="font-size:32px;margin-bottom:8px">👑</div>
            <span style="color:#ffd700;text-shadow:0 0 30px currentColor;font-size:22px">VIP-выигрыш</span>
            <div style="margin-top:14px;font-size:20px;color:#fff">+${(result.reward || 0).toLocaleString("ru-RU")} 🪙</div>`;
    }

    hapticNotify("success");
    modal.classList.remove("hidden");
    setTimeout(() => {
        modal.classList.add("hidden");
        if (resEl) resEl.innerHTML = "";
    }, 3500);
}

// ============================================================
//                     АНИМАЦИЯ КЕЙСА (для монетных)
// ============================================================

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
    reel.style.transition = "none";
    reel.style.transform = "translate3d(0,0,0)";
    reel.innerHTML = "";
    modal.classList.remove("hidden");
    void reel.offsetWidth;

    let result;
    try {
        result = await apiFn();
    } catch (e) {
        toast(e.message || "Ошибка", "error");
        modal.classList.add("hidden");
        state.caseOpening = false;
        if (e.status === 400 && /Недостаточно/.test(e.message || "")) {
            const caseData = COIN_CASES.find(c => title.includes(c.name));
            if (caseData) showInsufficientBalance(caseData.price, currentUser.balance);
        }
        return;
    }

    const WINNER_INDEX = 50;
    const items = [];
    for (let i = 0; i < 60; i++) items.push(pickRandomPrize());
    items[WINNER_INDEX] = pickRandomPrize();

    const frag = document.createDocumentFragment();
    items.forEach(it => {
        const div = document.createElement("div");
        div.className = `case-item r-${it.rarity}`;
        div.innerHTML = makeReelItemHTML(it);
        frag.appendChild(div);
    });
    reel.appendChild(frag);

    let winnerPrize;
    let winnerIndexOverride = null;

    if (result.gift) {
        winnerPrize = { kind: "gift", gift: result.gift.id, emoji: result.gift.emoji, label: result.gift.name, rarity: "legendary" };
    } else if (result.win) {
        const realRarity = MULT_TO_RARITY[result.multiplier_index]?.rarity || "common";
        winnerPrize = pickPrizeByRarity(realRarity);
    } else {
        // Проигрыш — базовая пустая
        winnerPrize = CASE_PRIZES[0];
        // Near-miss: показываем легендарный слот рядом с маркером
        if (result.near_miss && result.hint_index != null) {
            const nearPrize = CASE_PRIZES.find(p => p.rarity === "legendary") || CASE_PRIZES[0];
            const nearIdx = WINNER_INDEX + 1;  // на 1 вправо от маркера
            if (items[nearIdx]) {
                const nearEl = reel.children[nearIdx];
                if (nearEl) {
                    nearEl.className = `case-item r-legendary`;
                    nearEl.innerHTML = makeReelItemHTML(nearPrize);
                }
            }
        }
    }

    const winnerEl = reel.children[WINNER_INDEX];
    if (winnerEl) {
        winnerEl.className = `case-item r-${winnerPrize.rarity}`;
        winnerEl.innerHTML = makeReelItemHTML(winnerPrize);
    }
    void reel.offsetWidth;

    let wrapWidth = 340;
    const wrapEl = modal.querySelector(".case-reel-wrap");
    if (wrapEl) wrapWidth = wrapEl.getBoundingClientRect().width || 340;
    const ITEM_W = 96;
    const targetX = -(WINNER_INDEX * ITEM_W + ITEM_W / 2 - wrapWidth / 2);
    const jitter = (Math.random() - 0.5) * (ITEM_W * 0.3);

    reel.style.transition = "transform 3.6s cubic-bezier(0.32, 0.72, 0, 1)";
    reel.style.transform = `translate3d(${targetX + jitter}px, 0, 0)`;

    setTimeout(() => {
        if (!state.caseOpening) return;
        showCaseResult(result, winnerPrize);
    }, 3700);
}

function showCaseResult(result, prize) {
    const modal = document.getElementById("case-modal");
    const resEl = document.getElementById("case-modal-result");
    const isJackpot = result.jackpot;

    if (result.gift) {
        resEl.innerHTML = `
            <div style="font-size:48px;margin-bottom:8px">${result.gift.emoji}</div>
            <span style="color:#ffd700;text-shadow:0 0 30px currentColor">🎁 ПОДАРОК!</span>
            <div style="margin-top:14px;font-size:22px;color:#fff">${escapeHtml(result.gift.name)}</div>`;
        hapticNotify("success");
    } else if (result.win) {
        const profit = result.reward - result.cost;
        const profitColor = profit >= 0 ? "#22dd88" : "#ff3b5b";
        const profitSign = profit >= 0 ? "+" : "";
        // LDW: даже если ушли в минус — показываем "ПОБЕДА"
        const headerText = isJackpot ? "🎉 JACKPOT!" : (result.ldw ? "🎉 ВЫИГРЫШ!" : "🏆 ПОБЕДА!");
        resEl.innerHTML = `
            <div style="font-size:32px;margin-bottom:8px">${prize.emoji}</div>
            <span style="color:${isJackpot ? '#ff3b5b' : '#ffd700'};text-shadow:0 0 30px currentColor">${headerText}</span>
            <div style="margin-top:14px;font-size:20px;color:#fff">${result.reward.toLocaleString("ru-RU")} 🪙</div>
            <div style="margin-top:6px;font-size:14px;color:${profitColor}">Чистыми: <b>${profitSign}${profit.toLocaleString("ru-RU")}</b> 🪙</div>`;
        hapticNotify("success");
    } else {
        resEl.innerHTML = `
            <span style="color:#ff3b5b;font-size:22px">💔 Проигрыш</span>
            <div style="margin-top:14px;font-size:15px;color:#ff3b5b">Чистыми: <b>-${result.cost.toLocaleString("ru-RU")}</b> 🪙</div>`;
        hapticNotify("error");
    }

    if (result.balance !== undefined) setBalance(result.balance, true);
    renderProfile();
    renderDropsFeed();

    // DON: если сервер предложил удвоение
    const autoCloseMs = result.don_available > 0 ? 6000 : (result.cost === 0 ? 3500 : 2400);
    setTimeout(() => {
        modal.classList.add("hidden");
        const reel = document.getElementById("case-reel");
        if (reel) { reel.style.transition = "none"; reel.style.transform = "translate3d(0,0,0)"; reel.innerHTML = ""; }
        state.caseOpening = false;

        if (result.don_available > 0) {
            showDonOffer(result.don_available);
        }
    }, autoCloseMs);
}

function forceCloseCase() {
    state.caseOpening = false;
    const modal = document.getElementById("case-modal");
    if (modal) modal.classList.add("hidden");
    const reel = document.getElementById("case-reel");
    if (reel) { reel.style.transition = "none"; reel.style.transform = "translate3d(0,0,0)"; reel.innerHTML = ""; }
}

// ============================================================
//                     DOUBLE OR NOTHING
// ============================================================

let donTimerId = null;
let donAmount = 0;

function showDonOffer(amount) {
    donAmount = amount;
    const modal = document.getElementById("don-modal");
    const amountEl = document.getElementById("don-amount");
    const doubleEl = document.getElementById("don-double");
    if (!modal) return;
    if (amountEl) amountEl.textContent = amount.toLocaleString("ru-RU");
    if (doubleEl) doubleEl.textContent = (amount * 2).toLocaleString("ru-RU");
    modal.classList.remove("hidden");
    haptic("medium");

    // Таймер 30 сек
    if (donTimerId) clearTimeout(donTimerId);
    donTimerId = setTimeout(() => {
        closeDonOffer();
    }, 30000);
}

function closeDonOffer() {
    if (donTimerId) { clearTimeout(donTimerId); donTimerId = null; }
    const modal = document.getElementById("don-modal");
    if (modal) modal.classList.add("hidden");
    donAmount = 0;
}

async function donChoose(take) {
    if (!donAmount) { closeDonOffer(); return; }
    haptic("medium");
    try {
        const r = await apiCall("/api/don", { take });
        if (r.win) {
            toast(`🔥 УДВОИЛ! +${r.reward.toLocaleString("ru-RU")} 🪙`, "success", 4000);
            hapticNotify("success");
        } else if (r.skipped) {
            toast(`💰 Забрал ${r.amount.toLocaleString("ru-RU")} 🪙`, "info");
        } else {
            toast(`💀 Не повезло. -${r.lost.toLocaleString("ru-RU")} 🪙`, "error", 4000);
            hapticNotify("error");
        }
        if (r.balance !== undefined) setBalance(r.balance, true);
        await refreshMe();
        renderProfile();
        renderDropsFeed();
    } catch (e) {
        toast(e.message, "error");
    }
    closeDonOffer();
}

// ============================================================
//                     БЕСПЛАТНЫЙ КЕЙС
// ============================================================

let freeCaseTimerId = null;
const FREE_CASE_COOLDOWN = 6 * 60 * 60 * 1000;

function startFreeCaseTimer() {
    if (freeCaseTimerId) clearInterval(freeCaseTimerId);
    updateFreeCaseUI();
    freeCaseTimerId = setInterval(updateFreeCaseUI, 1000);
}

function updateFreeCaseUI() {
    const card = document.getElementById("free-case-card");
    const timer = document.getElementById("free-case-timer");
    if (!card || !timer) return;
    const last = currentUser.last_free_case || "1970-01-01 00:00:00";
    const lastDt = new Date(last.replace(" ", "T"));
    const diff = Date.now() - lastDt.getTime();
    if (diff >= FREE_CASE_COOLDOWN || isNaN(lastDt.getTime())) {
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
    await runCaseAnimation("🎁 Бесплатный кейс", () => apiCall("/api/free_case", {}));
    await refreshMe();
    renderProfile();
    updateFreeCaseUI();
}

// ============================================================
//                     КОЛЁСА
// ============================================================

function buildWheel(wheelId, values, emoji, labels) {
    const inner = document.getElementById(`${wheelId}-inner`);
    if (!inner) return;
    inner.innerHTML = "";
    const n = values.length;
    const seg = 360 / n;
    for (let i = 0; i < n; i++) {
        const label = document.createElement("div");
        label.className = "wheel-seg-label";
        const angle = i * seg + seg / 2;
        label.style.transform = `rotate(${angle - 90}deg) translate(90px, 0)`;
        label.textContent = labels[i];
        inner.appendChild(label);
    }
}

let wheelRotations = { "wheel": 0, "wheel-free": 0, "wheel-vip": 0 };

async function spinWheelGeneric(wheelId, apiPath, btnId, resultId) {
    const btn = document.getElementById(btnId);
    if (btn.disabled) return;
    btn.disabled = true;
    haptic("medium");
    const wheelEl = document.getElementById(wheelId);
    const resultEl = document.getElementById(resultId);
    resultEl.textContent = "";
    resultEl.className = "game-result";

    let result;
    try {
        result = await apiCall(apiPath, {});
    } catch (e) {
        toast(e.message, "error");
        btn.disabled = false;
        return;
    }

    const cfg = WHEEL_CONFIG[wheelId];
    const seg = 360 / cfg.values.length;
    const current = wheelRotations[wheelId];
    const normalizedCurrent = ((current % 360) + 360) % 360;
    const targetIn360 = (360 - (result.index * seg + seg / 2)) % 360;
    const delta = (targetIn360 - normalizedCurrent + 360) % 360;
    wheelRotations[wheelId] += 360 * 5 + delta;
    wheelEl.style.transform = `rotate(${wheelRotations[wheelId]}deg)`;

    setTimeout(async () => {
        if (result.reward > 0) {
            resultEl.innerHTML = `${cfg.emoji[result.index]} +${result.reward.toLocaleString("ru-RU")} 🪙`;
            resultEl.classList.add("win");
            hapticNotify("success");
        } else {
            resultEl.textContent = "💀 Пусто";
            resultEl.classList.add("lose");
            hapticNotify("error");
        }
        // Подарок
        if (result.gift) {
            resultEl.innerHTML += `<br><span style="color:#ffd700;font-size:15px;margin-top:6px;display:inline-block">🎁 БОНУС: ${result.gift.emoji} ${escapeHtml(result.gift.name)}!</span>`;
        }
        if (result.balance !== undefined) setBalance(result.balance, true);
        await refreshMe();
        renderProfile();
        renderDropsFeed();
        btn.disabled = false;
        wheelEl.style.transition = "none";
        wheelRotations[wheelId] = wheelRotations[wheelId] % 360;
        wheelEl.style.transform = `rotate(${wheelRotations[wheelId]}deg)`;
        setTimeout(() => { wheelEl.style.transition = "transform 5s cubic-bezier(0.32, 0.72, 0, 1)"; }, 50);
        if (wheelId === "wheel-free") updateFreeWheelButton();
    }, 5100);
}

function spinWheel()     { return spinWheelGeneric("wheel", "/api/spin_wheel", "spin-btn", "wheel-result"); }
function spinWheelFree() { return spinWheelGeneric("wheel-free", "/api/spin_wheel_free", "spin-free-btn", "wheel-free-result"); }

function spinWheelVip() {
    startStarPayment("vip_wheel", {}, (result) => {
        const idx = result.index || 0;
        const reward = result.reward || 0;
        const cfg = WHEEL_CONFIG["wheel-vip"];

        const wheelEl = document.getElementById("wheel-vip");
        const resultEl = document.getElementById("wheel-vip-result");
        if (!wheelEl || !resultEl) return;

        const seg = 360 / cfg.values.length;
        const current = wheelRotations["wheel-vip"];
        const normalizedCurrent = ((current % 360) + 360) % 360;
        const targetIn360 = (360 - (idx * seg + seg / 2)) % 360;
        const delta = (targetIn360 - normalizedCurrent + 360) % 360;
        wheelRotations["wheel-vip"] += 360 * 5 + delta;
        wheelEl.style.transform = `rotate(${wheelRotations["wheel-vip"]}deg)`;

        setTimeout(async () => {
            if (reward > 0) {
                resultEl.innerHTML = `${cfg.emoji[idx]} +${reward.toLocaleString("ru-RU")} 🪙`;
                resultEl.classList.add("win");
            } else {
                resultEl.textContent = "💀 Пусто";
                resultEl.classList.add("lose");
            }
            // Подарок
            if (result.gift) {
                const g = result.gift;
                const gName = g.name || g.gift_name || "Подарок";
                const gEmoji = g.emoji || "🎁";
                resultEl.innerHTML += `<br><span style="color:#ffd700;font-size:15px;margin-top:6px;display:inline-block">🎁 БОНУС: ${gEmoji} ${escapeHtml(gName)}!</span>`;
            }
            wheelEl.style.transition = "none";
            wheelRotations["wheel-vip"] = wheelRotations["wheel-vip"] % 360;
            wheelEl.style.transform = `rotate(${wheelRotations["wheel-vip"]}deg)`;
            setTimeout(() => { wheelEl.style.transition = "transform 5s cubic-bezier(0.32, 0.72, 0, 1)"; }, 50);
            await refreshMe();
            renderProfile();
            renderLeaderboard();
            renderDropsFeed();
        }, 5100);
    });
}

let freeWheelTimer = null;
const FREE_WHEEL_COOLDOWN = 4 * 60 * 60 * 1000;

function startFreeWheelTimer() {
    if (freeWheelTimer) clearInterval(freeWheelTimer);
    updateFreeWheelButton();
    freeWheelTimer = setInterval(updateFreeWheelButton, 1000);
}

function updateFreeWheelButton() {
    const btn = document.getElementById("spin-free-btn");
    if (!btn) return;
    const last = currentUser.last_free_wheel || "1970-01-01 00:00:00";
    const lastDt = new Date(last.replace(" ", "T"));
    const diff = Date.now() - lastDt.getTime();
    if (diff >= FREE_WHEEL_COOLDOWN || isNaN(lastDt.getTime())) {
        btn.disabled = false;
        btn.textContent = "Крутить бесплатно";
    } else {
        const left = FREE_WHEEL_COOLDOWN - diff;
        const h = Math.floor(left / 3_600_000);
        const m = Math.floor((left % 3_600_000) / 60_000);
        const s = Math.floor((left % 60_000) / 1000);
        btn.disabled = true;
        btn.textContent = `Через ${h}ч ${String(m).padStart(2, "0")}м ${String(s).padStart(2, "0")}с`;
    }
}

// ============================================================
//                     МОНЕТКА 3D
// ============================================================

async function playCoin(choice) {
    if (state.coinPlaying) return;
    state.coinPlaying = true;
    haptic("medium");

    const coinEl   = document.getElementById("coin3d");
    const resultEl = document.getElementById("coin-result");
    const btnEagle = document.getElementById("coin-eagle");
    const btnKing  = document.getElementById("coin-king");

    btnEagle.disabled = true;
    btnKing.disabled  = true;
    resultEl.textContent = "";
    resultEl.className = "game-result";

    let result;
    try {
        result = await apiCall("/api/play_coin", { choice });
    } catch (e) {
        toast(e.message, "error");
        if (e.status === 400 && /Недостаточно/.test(e.message || "")) {
            showInsufficientBalance(50, currentUser.balance);
        }
        btnEagle.disabled = false;
        btnKing.disabled  = false;
        state.coinPlaying = false;
        return;
    }

    const spins = 8 + Math.floor(Math.random() * 6);
    const finalAngle = result.side === "eagle" ? 0 : 180;

    const currentRotation = state.coinRotation || 0;
    const baseTarget = 360 * spins;
    const normalizedCurrent = ((currentRotation % 360) + 360) % 360;
    const delta = (finalAngle - normalizedCurrent + 360) % 360;
    state.coinRotation = currentRotation + baseTarget + delta;

    // Сброс transform без transition — потом анимация
    coinEl.style.transition = "none";
    coinEl.style.transform  = `rotateY(${state.coinRotation}deg) translateZ(0)`;
    void coinEl.offsetWidth;   // принудительный reflow

    const duration = 3.2 + Math.random() * 0.6;
    coinEl.style.transition = `transform ${duration}s cubic-bezier(0.32, 0.72, 0, 1)`;
    coinEl.style.transform  = `rotateY(${state.coinRotation}deg) translateZ(0)`;

    setTimeout(async () => {
        if (result.win) {
            resultEl.innerHTML = `🎉 ${result.side === "eagle" ? "🦅 Орёл" : "👑 Решка"} — победа! <b>+${result.reward}</b> 🪙`;
            resultEl.classList.add("win");
            hapticNotify("success");
        } else {
            resultEl.innerHTML = `💔 ${result.side === "eagle" ? "🦅 Орёл" : "👑 Решка"} — проигрыш`;
            resultEl.classList.add("lose");
            hapticNotify("error");
        }
        if (result.balance !== undefined) setBalance(result.balance, true);
        await refreshMe();
        renderProfile();
        renderDropsFeed();
        btnEagle.disabled = false;
        btnKing.disabled  = false;
        state.coinPlaying = false;
    }, Math.round(duration * 1000) + 200);
}

function buildCoinEdges() {
    const coin = document.getElementById("coin3d");
    if (!coin) return;

    // Удаляем старые рёбра, если были (36 сегментов — legacy-код)
    coin.querySelectorAll(".coin-edge").forEach(e => e.remove());

    // Одно кольцо-подложка вместо 36 сегментов
    const edge = document.createElement("div");
    edge.className = "coin-edge";
    coin.insertBefore(edge, coin.firstChild);
}

// ============================================================
//                     КОСТИ
// ============================================================

const DICE_ROTATIONS = {
    1: { x: 0,   y: 0 }, 2: { x: 90,  y: 0 }, 3: { x: 0,   y: -90 },
    4: { x: 0,   y: 90 }, 5: { x: -90, y: 0 }, 6: { x: 0,   y: 180 },
};

function setDiceToValue(el, value, delay = 0) {
    const rot = DICE_ROTATIONS[value] || DICE_ROTATIONS[1];
    const extraX = 360 * (3 + Math.floor(Math.random() * 3));
    const extraY = 360 * (3 + Math.floor(Math.random() * 3));
    const duration = 2.4 + Math.random() * 0.5;
    el.style.transition = `transform ${duration}s cubic-bezier(0.32, 0.72, 0, 1) ${delay}s`;
    el.style.transform = `rotateX(${rot.x + extraX}deg) rotateY(${rot.y + extraY}deg) translateZ(0)`;
}

async function rollDice() {
    if (state.rolling) return;
    if (currentUser.balance < 50) {
        hapticNotify("error");
        showInsufficientBalance(50, currentUser.balance);
        return;
    }
    state.rolling = true;
    haptic("medium");
    const d1el = document.getElementById("dice1"), d2el = document.getElementById("dice2");
    const resultEl = document.getElementById("dice-result");
    resultEl.textContent = "";
    resultEl.className = "game-result";

    let result;
    try {
        result = await apiCall("/api/roll_dice", {});
    } catch (e) {
        toast(e.message, "error");
        state.rolling = false;
        return;
    }

    d1el.style.transition = "none";
    d2el.style.transition = "none";
    d1el.style.transform = "rotateX(0) rotateY(0)";
    d2el.style.transform = "rotateX(0) rotateY(0)";
    void d1el.offsetWidth; void d2el.offsetWidth;
    setDiceToValue(d1el, result.dice[0], 0);
    setDiceToValue(d2el, result.dice[1], 0.15);

    setTimeout(async () => {
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
        if (result.balance !== undefined) setBalance(result.balance, true);
        await refreshMe();
        renderProfile();
        renderDropsFeed();
        state.rolling = false;
    }, 2900);
}

// ============================================================
//                     САПЁР — ГИБРИД
// ============================================================

function bindSaperLevels() {
    document.querySelectorAll(".saper-level").forEach(btn => {
        btn.addEventListener("click", () => {
            const level = btn.dataset.level;
            const size = parseInt(btn.dataset.size);
            const mines = parseInt(btn.dataset.mines);
            // Показываем карточку выбора режима
            openSaperModeSelect(level, size, mines);
        });
    });
}

function openSaperModeSelect(level, size, mines) {
    const costCoins = { easy: 10, medium: 25, hard: 50 }[level] || 10;
    const costStars = { easy: 5, medium: 15, hard: 25 }[level] || 5;
    const label = { easy: "Лёгкий", medium: "Средний", hard: "Хард" }[level] || level;
    const modal = document.getElementById("saper-mode-modal");
    if (!modal) return;

    document.getElementById("saper-mode-title").textContent = `💣 Сапёр · ${label}`;
    document.getElementById("saper-mode-info").textContent = `${size}×${size} · ${mines} мин`;

    const coinsBtn = document.getElementById("saper-mode-coins");
    const starsBtn = document.getElementById("saper-mode-stars");
    if (coinsBtn) {
        coinsBtn.textContent = `🪙 Играть за ${costCoins} · RTP 88%`;
        coinsBtn.onclick = () => { closeModal("saper-mode-modal"); startSaperGame(level, "coins"); };
    }
    if (starsBtn) {
        starsBtn.textContent = `⭐ Премиум ${costStars} · RTP 96% + 🎁`;
        starsBtn.onclick = () => {
            closeModal("saper-mode-modal");
            startStarPayment("saper", { level }, (result) => {
                toast(`💣 Премиум-сапёр куплен: +${result.stake} 🪙`, "success", 4000);
                setTimeout(() => startSaperGame(level, "stars"), 800);
            });
        };
    }
    modal.classList.remove("hidden");
    haptic("light");
}

async function startSaperGame(level, mode) {
    const cfgSizes = { easy: { size: 3, mines: 2 }, medium: { size: 5, mines: 5 }, hard: { size: 7, mines: 10 } };
    const cfg = cfgSizes[level];
    if (!cfg) return;

    const costCoins = { easy: 10, medium: 25, hard: 50 }[level] || 10;

    if (mode === "coins" && currentUser.balance < costCoins) {
        hapticNotify("error");
        showInsufficientBalance(costCoins, currentUser.balance);
        return;
    }

    let result;
    try {
        // Сервер сам сгенерирует мины и запомнит их
        result = await apiCall("/api/saper/start", { level, mode });
    } catch (e) {
        toast(e.message, "error");
        return;
    }
    haptic("medium");

    document.getElementById("saper-setup").classList.add("hidden");
    document.getElementById("saper-play").classList.remove("hidden");
    document.getElementById("saper-cashout").style.display = "none";

    const grid = document.getElementById("saper-grid");
    grid.style.gridTemplateColumns = `repeat(${cfg.size}, 1fr)`;
    grid.innerHTML = "";
    document.getElementById("saper-info").textContent =
        `${cfg.size}×${cfg.size} · ${cfg.mines} мин · ${mode === "coins" ? "🪙" : "⭐"}`;

    const resEl = document.getElementById("saper-result");
    resEl.textContent = "";
    resEl.className = "game-result";

    const total = cfg.size * cfg.size;
    const totalSafe = total - cfg.mines;

    state.saperActive = true;
    state.saperSafe = 0;
    state.saperTotal = totalSafe;
    state.saperConfig = { level, mode, ...cfg };
    state.saperCost = costCoins;
    // Мины больше не храним локально — они только на сервере
    state.saperMines = [];

    for (let i = 0; i < total; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.addEventListener("click", () => handleSaperClickServer(cell, i));
        grid.appendChild(cell);
    }

    if (result.balance !== undefined) setBalance(result.balance, true);
}

function updateCashoutButton() {
    const btn = document.getElementById("saper-cashout");
    const valEl = document.getElementById("saper-cashout-value");
    if (!btn || !valEl) return;
    const cfg = state.saperConfig;
    if (!cfg || state.saperSafe === 0) { btn.style.display = "none"; return; }
    const pct = state.saperSafe / state.saperTotal;
    const mult = 1 + pct * 1.5;
    const reward = Math.floor((state.saperCost || 10) * mult);
    btn.style.display = "block";
    valEl.textContent = reward.toLocaleString("ru-RU");
}

async function handleSaperClickServer(cell, index) {
    if (!state.saperActive) return;
    if (cell.classList.contains("opened") || cell.classList.contains("mine")) return;
    if (cell.classList.contains("pending")) return;
    // Блокируем клетку на время запроса — защита от спам-тапов
    cell.classList.add("pending");

    let resp;
    try {
        resp = await apiCall("/api/saper/click", { index });
    } catch (e) {
        cell.classList.remove("pending");
        if (e.status === 409) return; // клетка уже открыта — тихо игнорим
        toast(e.message, "error");
        return;
    }

    cell.classList.remove("pending");

    if (resp.boom) {
        // Попал на мину
        cell.textContent = "💣";
        cell.classList.add("mine");
        hapticNotify("error");

        // Раскрываем остальные мины (сервер прислал их позиции)
        const allCells = document.querySelectorAll("#saper-grid .cell");
        (resp.mines || []).forEach(idx => {
            if (allCells[idx] && allCells[idx] !== cell) {
                allCells[idx].textContent = "💣";
                allCells[idx].classList.add("mine");
            }
        });
        await finishSaper();
    } else {
        // Безопасная клетка
        cell.textContent = "✅";
        cell.classList.add("opened");
        state.saperSafe = resp.opened_count;
        haptic("light");
        updateCashoutButton();
        // Если открыл все безопасные — авто-финиш
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
    if (!state.saperConfig) return;
    const cfg = state.saperConfig;
    // Мгновенно ставим флаг — защита от повторного вызова
    state.saperActive = false;
    state.saperSafe = 0;
    state.saperConfig = null;

    let result;
    try {
        // cells_opened больше не отправляем — сервер считает сам
        result = await apiCall("/api/saper/finish", {
            level: cfg.level,
            mode: cfg.mode,
        });
    } catch (e) {
        toast(e.message, "error");
        return;
    }

    const el = document.getElementById("saper-result");
    if (result.reward > 0) {
        el.innerHTML = `<span style="color:#22dd88">✅ +${result.reward} 🪙 (${result.opened} клеток, ×${result.multiplier.toFixed(2)})</span>`;
        el.classList.add("win");
        hapticNotify("success");
    } else {
        el.innerHTML = `<span style="color:#ff3b5b">💥 Пусто</span>`;
        el.classList.add("lose");
    }

    if (result.gift) {
        const g = result.gift;
        el.innerHTML += `<br><span style="color:#ffd700;font-size:15px;margin-top:6px;display:inline-block">🎁 БОНУС: ${g.emoji} ${escapeHtml(g.name)}!</span>`;
    }

    if (result.balance !== undefined) setBalance(result.balance, true);
    await refreshMe();
    renderProfile();
    renderDropsFeed();
    document.getElementById("saper-cashout").style.display = "none";
}

function resetSaperState() {
    state.saperActive = false;
    state.saperSafe = 0;
    state.saperConfig = null;
    const setup = document.getElementById("saper-setup"), play = document.getElementById("saper-play");
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
//                     МАГАЗИН
// ============================================================

const COIN_PACKS = [
    { coins: 100,   stars: 10,   bonus: null,   cls: "" },
    { coins: 250,   stars: 25,   bonus: "+5%",  cls: "" },
    { coins: 500,   stars: 50,   bonus: "+10%", cls: "" },
    { coins: 1000,  stars: 100,  bonus: "+15%", cls: "gold" },
    { coins: 2500,  stars: 250,  bonus: "+20%", cls: "gold" },
    { coins: 5000,  stars: 500,  bonus: "+25%", cls: "epic" },
    { coins: 10000, stars: 1000, bonus: "+30%", cls: "mega" },
];

const VIP_ITEMS = [
    { id: "vip_day",   name: "VIP на 1 день", emoji: "👑", cost: 25 },
    { id: "vip_week",  name: "VIP на неделю", emoji: "👑", cost: 100 },
    { id: "vip_month", name: "VIP на месяц",  emoji: "👑", cost: 300 },
    { id: "no_ads",    name: "Без рекламы",   emoji: "🚫", cost: 50 },
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
        </div>`).join("")
        + `<div class="topup-card custom" onclick="openCustomTopUp()"><div class="topup-card-coin">✨</div><div><div class="topup-card-amount">Своя сумма</div><div class="topup-card-price">от 100 🪙</div></div></div>`;
}

function buildShopGrid() {
    const grid = document.getElementById("shop-grid");
    if (!grid) return;
    const disc = currentUser.vip_discount || 0;
    let html = "";
    COIN_PACKS.forEach(o => {
        const total = Math.floor(o.coins * (1 + (parseInt(o.bonus) || 0) / 100));
        const finalStars = disc > 0 ? Math.max(1, Math.floor(o.stars * (100 - disc) / 100)) : o.stars;
        const discLine = disc > 0 ? ` <span style="color:#22dd88;font-size:11px">-${disc}%</span>` : "";
        if (o.cls === "mega") {
            html += `<button class="shop-card coins mega" onclick="buyCoins(${o.coins})">
                ${o.bonus ? `<div class="shop-badge best">${o.bonus}</div>` : ''}
                <div class="coin-big">💎</div>
                <div class="coin-info">
                    <div class="coin-amount">${total.toLocaleString("ru-RU")} монет</div>
                    <div class="coin-stars">${finalStars} ⭐${discLine}</div>
                </div>
            </button>`;
        } else {
            html += `<button class="shop-card coins ${o.cls}" onclick="buyCoins(${o.coins})">
                ${o.bonus ? `<div class="coin-bonus">${o.bonus}</div>` : ''}
                <div class="coin-big">🪙</div>
                <div class="coin-amount">${total.toLocaleString("ru-RU")}</div>
                <div class="coin-stars">${finalStars} ⭐${discLine}</div>
            </button>`;
        }
    });
    grid.innerHTML = html;
}

function buyCoins(coins) {
    startStarPayment("buy_coins", { base: coins }, (result) => {
        toast(`✅ Зачислено ${result.total.toLocaleString("ru-RU")} монет`, "success", 4000);
        closeModal("topup-modal");
        renderProfile();
    });
}

function openCustomTopUp() { document.getElementById("custom-modal").classList.remove("hidden"); }

function submitCustomTopUp() {
    const v = parseInt(document.getElementById("custom-coins-input").value);
    if (!v || v < 100 || v > 100000) { toast("Введите число от 100 до 100 000", "error"); return; }
    closeModal("custom-modal");
    startStarPayment("buy_coins", { custom: v }, (result) => {
        toast(`✅ Зачислено ${result.total.toLocaleString("ru-RU")} монет`, "success", 4000);
        closeModal("topup-modal");
    });
}

// ============================================================
//                     УКРАШЕНИЯ
// ============================================================

function renderDecorShopPanel() {
    const content = document.getElementById("shop-perks-content");
    if (!content || !DECOR_PRICES) return;
    const items = state.currentDecorTab === "color" ? NAME_COLORS_META : FRAMES_META;
    const prices = DECOR_PRICES[state.currentDecorTab] || {};
    const current = state.currentDecorTab === "color"
        ? (currentUser.name_color || state.nameColor)
        : (currentUser.frame_id || state.frameId);

    content.innerHTML = Object.keys(items).map(id => {
        const it = items[id];
        const price = prices[id] || { price: 0, currency: "coins" };
        const isActive = current === id;
        const isFree = price.price === 0;
        const priceText = isFree ? "Бесплатно" : `${price.price.toLocaleString("ru-RU")} ${price.currency === 'stars' ? '⭐' : '🪙'}`;
        let previewStyle = "";
        if (state.currentDecorTab === "color") {
            const colors = { "": "#fff", gold: "#ffd700", blue: "#00aaff", pink: "#ff3b8b", purple: "#c04cff", green: "#22dd88", red: "#ff5c5c", cyan: "#00ffe1" };
            if (id === "rainbow") {
                previewStyle = "background: linear-gradient(90deg, #ff3b5b, #ffd700, #22dd88, #00aaff, #c04cff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;";
            } else {
                previewStyle = `color: ${colors[id] || "#fff"};`;
            }
        } else {
            const borders = { "": "#8a8aa0", gold: "#ffd700", blue: "#00aaff", neon: "#22dd88", ocean: "#00ffe1", fire: "#ff3b5b", sunset: "#ff8c5c", legendary: "#c04cff", royal: "#d4a8ff" };
            previewStyle = `border-color: ${borders[id] || "#8a8aa0"};`;
        }
        return `
            <div class="decor-item ${isActive ? 'active' : ''}" onclick="selectDecor('${id}')">
                <div class="decor-preview" style="${previewStyle}">Aa</div>
                <div class="decor-info">
                    <div class="decor-name">${it.name}</div>
                    <div class="decor-price">${priceText}</div>
                </div>
                ${isActive ? '<div class="decor-status">✓</div>' : ''}
            </div>`;
    }).join("");
}

function switchDecorTab(tab, btn) {
    state.currentDecorTab = tab;
    document.querySelectorAll(".decor-tab").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderDecorShopPanel();
}

async function selectDecor(id) {
    if (!DECOR_PRICES) return;
    const prices = DECOR_PRICES[state.currentDecorTab] || {};
    const item = prices[id];
    if (!item) return;

    const decorType = state.currentDecorTab === "color" ? "color" : "frame";

    if (item.currency === "stars" && item.price > 0) {
        startStarPayment("decor", { type: decorType, id }, (result) => {
            if (decorType === "color") { state.nameColor = id; currentUser.name_color = id; }
            else { state.frameId = id; currentUser.frame_id = id; }
            saveDecorState();
            renderProfile();
            renderDecorShopPanel();
            renderLeaderboard();
            toast("✅ Применено", "success");
        });
        return;
    }

    // Монетные — сервер сам проверит и спишет
    try {
        const r = await apiCall("/api/decor", { type: decorType, id });
        if (decorType === "color") { state.nameColor = id; currentUser.name_color = r.name_color || id; }
        else { state.frameId = id; currentUser.frame_id = r.frame_id || id; }
        if (r.balance !== undefined) setBalance(r.balance, true);
        saveDecorState();
        renderProfile();
        renderDecorShopPanel();
        renderLeaderboard();
        toast("✅ Применено", "success");
        hapticNotify("success");
    } catch (e) {
        if (e.status === 400 && /Недостаточно/.test(e.message || "")) {
            showInsufficientBalance(item.price, currentUser.balance);
        } else {
            toast(e.message, "error");
        }
    }
}

function openDecorShop() { switchTab("shop"); switchShopCat("perks"); }

// ============================================================
//                     VIP-ПОДПИСКИ
// ============================================================

function buildVipGrid() {
    const grid = document.getElementById("shop-vip");
    if (!grid) return;
    grid.innerHTML = VIP_ITEMS.map(p => `
        <button class="shop-card vip" onclick="buyVip('${p.id}')">
            <div class="shop-coin">${p.emoji}</div>
            <div class="shop-name">${p.name}</div>
            <div class="shop-price">${p.cost} ⭐</div>
        </button>`).join("");
}

function buyVip(subId) {
    startStarPayment("vip_sub", { sub_id: subId }, (result) => {
        toast(`✅ VIP активирован на ${result.days} дней!`, "success", 4000);
    });
}

// ============================================================
//                     ПИТОМЦЫ
// ============================================================

function buildPetsGrid() {
    const grid = document.getElementById("shop-pets");
    if (!grid || !PETS_LIST) return;
    grid.innerHTML = PETS_LIST.map(p => {
        const owned = hasPet(p.id);
        return `
            <button class="shop-card pet ${owned ? 'owned' : ''}" onclick="${owned ? `openPetsManager()` : `openPetModal('${p.id}')`}">
                <div class="shop-coin">${p.emoji}</div>
                <div class="shop-name">${p.name}</div>
                <div class="shop-price">${owned ? "Настроить" : p.price + " ⭐"}</div>
            </button>`;
    }).join("");
}

let petToBuy = null;

function openPetModal(petId) {
    const pet = PETS_LIST ? PETS_LIST.find(p => p.id === petId) : null;
    if (!pet) return;
    petToBuy = pet;
    const owned = hasPet(pet.id);
    const titleEl = document.getElementById("pet-modal-title");
    const descEl = document.getElementById("pet-modal-desc");
    const btn = document.getElementById("pet-buy-btn");
    const preview = document.getElementById("pet-preview");
    if (titleEl) titleEl.textContent = `${pet.emoji} ${pet.name}`;
    if (descEl) descEl.textContent = "Милый анимированный питомец";
    if (btn) { btn.textContent = owned ? "Уже куплено" : `Купить за ${pet.price} ⭐`; btn.disabled = owned; }
    preview.innerHTML = "";
    setTimeout(() => { state.previewLottie = loadLottie(preview, LOTTIE_URLS.cat, "previewPet"); }, 50);
    document.getElementById("pet-modal").classList.remove("hidden");
    haptic("light");
}

function confirmBuyPet() {
    if (!petToBuy) return;
    if (hasPet(petToBuy.id)) { toast("Уже куплено", "info"); return; }

    startStarPayment("pet", { pet_id: petToBuy.id }, (result) => {
        closeModal("pet-modal");
        toast(`🐱 Питомец добавлен!`, "success", 3000);
        setTimeout(openPetsManager, 600);
    });
}

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
    const sizes = [{ id: "sm", name: "S" }, { id: "md", name: "M" }, { id: "lg", name: "L" }];
    content.innerHTML = `
        <div class="pm-item">
            <div class="pm-item-header">
                <div class="pm-item-emoji">🐱</div>
                <div class="pm-item-name">Кот</div>
            </div>
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
            </div>` : ''}
            <button class="pm-btn pm-remove" onclick="removePet('cat')">Убрать питомца</button>
        </div>`;
    modal.classList.remove("hidden");
    haptic("light");
}

function setPetPos(pos) { state.petPos = pos; currentUser.pet_pos = pos; savePetsState(); renderActivePet(); openPetsManager(); haptic("light"); }
function setPetSize(size) { state.petSize = size; currentUser.pet_size = size; savePetsState(); renderActivePet(); openPetsManager(); haptic("light"); }
function setPetInHeader(v) { state.petInHeader = !!v; currentUser.pet_in_header = !!v; savePetsState(); renderActivePet(); openPetsManager(); haptic("light"); }
function removePet(id) {
    currentUser.owned_pets = (currentUser.owned_pets || []).filter(x => x !== id);
    renderActivePet();
    buildPetsGrid();
    closeModal("pets-manager-modal");
    toast("Питомец убран (локально)", "info");
}

// ============================================================
//                     МОДАЛКИ
// ============================================================

function openTopUp() { document.getElementById("topup-modal").classList.remove("hidden"); haptic("light"); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.add("hidden"); }

function showInsufficientBalance(need, have) {
    const modal = document.getElementById("insufficient-modal");
    const text = document.getElementById("insufficient-text");
    const grid = document.getElementById("insufficient-grid");
    if (text) text.textContent = `Не хватает ${(need - have).toLocaleString("ru-RU")} 🪙. Пополни баланс:`;
    if (grid) {
        grid.innerHTML = COIN_PACKS.slice(0, 4).map(o => `
            <div class="topup-card" onclick="buyCoins(${o.coins});closeModal('insufficient-modal')">
                <div class="topup-card-coin">🪙</div>
                <div class="topup-card-amount">${o.coins.toLocaleString("ru-RU")}</div>
                <div class="topup-card-price">${o.stars} ⭐</div>
            </div>`).join("");
    }
    modal.classList.remove("hidden");
    haptic("light");
}

// ============================================================
//                     ПОДДЕРЖКА
// ============================================================

let selectedTopic = "Вопрос";
function selectTopic(btn) {
    document.querySelectorAll(".support-topic").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedTopic = btn.dataset.topic;
}
function openSupport() { document.getElementById("support-modal").classList.remove("hidden"); }
function closeSupportModal() {
    closeModal("support-modal");
    switchTab("home");
    document.querySelectorAll(".side-item[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === "home"));
}
async function submitSupport() {
    const text = document.getElementById("support-text").value.trim();
    if (!text) { toast("Введите текст", "error"); return; }
    try {
        await apiCall("/api/support", { topic: selectedTopic, text });
        toast("✅ Отправлено", "success");
        document.getElementById("support-text").value = "";
        closeSupportModal();
    } catch (e) { toast(e.message, "error"); }
}

// ============================================================
//                     WELCOME BACK
// ============================================================

async function claimWelcomeBack() {
    try {
        const r = await apiCall("/api/welcome_back", {});
        setBalance(r.balance, true);
        toast(`💎 Бонус возвращения: +${r.reward} 🪙`, "success", 4000);
        hapticNotify("success");
        await refreshMe();
        renderProfile();
        closeModal("welcome-modal");
    } catch (e) {
        toast(e.message, "error");
        closeModal("welcome-modal");
    }
}

// ============================================================
//                     DAILY
// ============================================================

async function claimDaily() {
    // legacy — теперь через стрик
    return claimStreak();
}

function copyRef() {
    const link = document.getElementById("ref-link").textContent;
    navigator.clipboard.writeText(link)
        .then(() => toast("📋 Скопировано", "success"))
        .catch(() => toast("Не удалось", "error"));
}

function resetDemo() {
    if (!confirm("Сбросить локальные настройки?")) return;
    [LS_PETS_KEY, LS_DECOR_KEY, LS_MUSIC_KEY].forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
    });
    location.reload();
}

// ============================================================
//                     МУЗЫКА (в разработке)
// ============================================================

function initMusic() { renderMusicPlayer(); renderMiniPlayer(); renderMyMusic(); }
function renderMusicPlayer() {}
function renderMiniPlayer() {}
function renderMyMusic() {}
function updatePlayButtons() {}
function toggleMusic() { toast("🚧 Музыка в разработке", "info"); }
function musicPrev() {}
function musicNext() {}
function musicShuffle() {}
function musicToggleRepeat() {}
function selectMusic() {}
function openMusicPicker() { toast("🚧 В разработке", "info"); }
function openAddMusicModal() { toast("🚧 В разработке", "info"); }

// ============================================================
//                     BOOTSTRAP
// ============================================================

async function bootstrap() {
    loadPetsState();
    loadDecorState();

    const u = tg.initDataUnsafe?.user || {};
    currentUser.id = u.id || 0;
    currentUser.first_name = u.first_name || "";
    currentUser.last_name = u.last_name || "";
    currentUser.username = u.username || "";

    try {
        initLottie();
        buildCases();
        buildStarCases();
        buildVipCases();
        buildCarouselDots();
        buildTopUpOptions();
        buildVipGrid();
        buildWheel("wheel",      WHEEL_CONFIG["wheel"].values,      WHEEL_CONFIG["wheel"].emoji,      WHEEL_CONFIG["wheel"].labels);
        buildWheel("wheel-free", WHEEL_CONFIG["wheel-free"].values, WHEEL_CONFIG["wheel-free"].emoji, WHEEL_CONFIG["wheel-free"].labels);
        buildWheel("wheel-vip",  WHEEL_CONFIG["wheel-vip"].values,  WHEEL_CONFIG["wheel-vip"].emoji,  WHEEL_CONFIG["wheel-vip"].labels);
        buildCoinEdges();
        bindCarouselSwipe();
        bindEdgeSwipe();
        bindSaperLevels();
        bindSideMenu();
        initMusic();

        // Грузим user + цены магазина параллельно
        await Promise.all([refreshMe(), loadShopPrices()]);

        // Строим гриды, которые зависят от цен
        buildShopGrid();
        buildPetsGrid();
        renderDecorShopPanel();

        renderProfile();
        renderSideMenu();
        renderDropsFeed();
        renderDropsGlobal();
        renderLeaderboard();
        renderTopToday();
        setBalance(currentUser.balance, false);
        renderActivePet();

        startFreeCaseTimer();
        startFreeWheelTimer();
        startHappyTimer();

        // Welcome back — если сервер не вернул streak_can_claim, но и недавно заходил,
        // покажем модалку вручную (по флагу из /me)
        if (currentUser.welcome_back_available) {
            setTimeout(() => {
                document.getElementById("welcome-modal").classList.remove("hidden");
            }, 2000);
        }

        document.querySelectorAll(".nav-btn").forEach(btn => {
            btn.addEventListener("click", () => switchTab(btn.dataset.tab));
        });
    } catch (e) {
        console.error("Bootstrap error:", e);
        toast("Ошибка: " + e.message, "error", 5000);
    }

    setTimeout(() => {
        document.getElementById("global-loader").classList.add("hidden");
        document.getElementById("app").classList.remove("hidden");
    }, 800);
}

if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootstrap);
} else {
    bootstrap();
}