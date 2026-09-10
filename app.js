/* ============================================================
   LIFELESS SHOP · WebApp Frontend
   Демо-режим форсирован (пока нет сервера)
   ============================================================ */

// ⚠️ ⚠️ ⚠️  ВАЖНО: Пока нет сервера — ДЕМО включено принудительно.
// После деплоя API на VPS — поменяй на false.
const FORCE_DEMO = true;
// ⚠️ ⚠️ ⚠️

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
    try { tg.expand(); } catch(_) {}
    tg.setHeaderColor?.("#06060f");
    tg.setBackgroundColor?.("#06060f");
}

const API_BASE = location.origin;

let currentUser = {
    id: 0, first_name: "", last_name: "", username: "", avatar_url: "",
    balance: 0, cases_opened: 0, referrals: 0,
    stars_spent: 0, total_wagered: 0, best_drop: 0,
    drops: [], rank: 1, total_users: 1,
    ref_link: "", last_free_case: 0, last_daily: "",
};
let state = { spinning: false, rolling: false, caseOpening: false, saperActive: false };

// ---------- Утилиты ----------
function haptic(t = "light") { try { tg.HapticFeedback?.impactOccurred(t); } catch(_) {} }
function hapticNotify(t = "success") { try { tg.HapticFeedback?.notificationOccurred(t); } catch(_) {} }

function toast(msg, type = "info", ms = 2500) {
    const cont = document.getElementById("toast-container");
    if (!cont) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.textContent = msg;
    cont.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transform = "translateX(120%)"; el.style.transition = "0.3s"; }, ms);
    setTimeout(() => el.remove(), ms + 400);
}

function openLink(url) {
    if (tg.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank");
}

// ============================================================
//              ЛОКАЛЬНАЯ БД (DEMO MODE)
// ============================================================
const LS_KEY = "lifeless_demo_v1";

function loadDemo() {
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) return JSON.parse(raw);
    } catch(_) {}
    return {
        balance: 50000,        // ← НАЧАЛЬНЫЙ БАЛАНС
        cases_opened: 0,
        referrals: 0,
        stars_spent: 0,
        total_wagered: 0,
        best_drop: 0,
        drops: [],
        last_free_case: 0,
        last_daily: "",
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
            drops: currentUser.drops.slice(0, 20),
            last_free_case: currentUser.last_free_case,
            last_daily: currentUser.last_daily,
        }));
    } catch(_) {}
}
function resetDemo() {
    if (!confirm("Сбросить весь прогресс? Баланс станет 50 000 🪙")) return;
    localStorage.removeItem(LS_KEY);
    location.reload();
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
    if (!res.ok) throw new Error(data.detail || "Ошибка");
    return data;
}

// ---------- Локальная экономика ----------
const CASE_MULTIPLIERS = [0.0, 0.5, 1.0, 1.5, 2.0, 4.0];
const CASE_WEIGHTS = [40, 20, 20, 12, 6, 2];

function pickMultiplier() {
    const total = CASE_WEIGHTS.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < CASE_WEIGHTS.length; i++) {
        if ((r -= CASE_WEIGHTS[i]) <= 0) return CASE_MULTIPLIERS[i];
    }
    return 0;
}
function getRtp(cases) {
    if (cases < 4) return 1.15;
    if (cases < 6) return 1.15 - ((1.15 - 0.92) / 2) * (cases - 3);
    return 0.92;
}
function happyBonus(x) {
    const h = new Date().getHours();
    return (h >= 20 && h < 22) ? Math.floor(x * 1.2) : x;
}

async function demoApi(path, body) {
    await new Promise(r => setTimeout(r, 120));

    switch (path) {
        case "/api/me":
            return {
                id: currentUser.id, first_name: currentUser.first_name,
                last_name: currentUser.last_name, username: currentUser.username,
                balance: currentUser.balance,
                cases_opened: currentUser.cases_opened,
                referrals: currentUser.referrals,
                stars_spent: currentUser.stars_spent,
                rank: currentUser.rank, total_users: currentUser.total_users,
                ref_link: currentUser.ref_link,
                is_admin: true,
                happy_hours: new Date().getHours() >= 20 && new Date().getHours() < 22,
                avatar_url: currentUser.avatar_url,
            };

        case "/api/leaderboard":
            return { top: generateFakeLeaderboard() };

        case "/api/open_case": {
            const cost = CASE_COSTS[body.case_id];
            if (currentUser.balance < cost) throw new Error("Недостаточно монет");
            currentUser.balance -= cost;
            currentUser.total_wagered += cost;
            const rtp = getRtp(currentUser.cases_opened);
            const m = pickMultiplier();
            let reward = Math.floor(cost * m * rtp);
            reward = happyBonus(reward);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop(`Кейс ${body.case_id}🪙`, reward - cost, m >= 4);
            saveDemo();
            return { reward, cost, balance: currentUser.balance, multiplier: m, win: m > 0, jackpot: m >= 4, rtp };
        }

        case "/api/open_star_case": {
            const stars = body.stars;
            const cost = stars * 10;
            if (currentUser.balance < cost) throw new Error("Недостаточно монет");
            currentUser.balance -= cost;
            currentUser.total_wagered += cost;
            const rtp = getRtp(currentUser.cases_opened);
            const tables = {
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
            const mults = tables[stars] || tables[10];
            const weights = [40, 20, 20, 12, 6, 2];
            const totalW = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * totalW, mIdx = 0;
            for (let i = 0; i < weights.length; i++) {
                if ((r -= weights[i]) <= 0) { mIdx = i; break; }
            }
            const m = mults[mIdx];
            let reward = Math.floor(cost * m * rtp);
            reward = happyBonus(reward);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop(`⭐ Кейс ${stars}⭐`, reward - cost, m >= mults[5]);
            saveDemo();
            return { reward, cost, balance: currentUser.balance, multiplier: m, win: m > 0, jackpot: m >= mults[5], rtp };
        }

        case "/api/spin_wheel": {
            if (currentUser.balance < 10) throw new Error("Недостаточно монет");
            currentUser.balance -= 10;
            currentUser.total_wagered += 10;
            const prizes = [0, 5, 10, 15, 20, 25, 30, 50];
            const weights = [25, 20, 18, 12, 10, 8, 5, 2];
            const total = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * total, idx = 0;
            for (let i = 0; i < weights.length; i++) {
                if ((r -= weights[i]) <= 0) { idx = i; break; }
            }
            const reward = happyBonus(prizes[idx]);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            addDrop("Колесо 🎡", reward - 10, reward >= 30);
            saveDemo();
            return { index: idx, reward, cost: 10, balance: currentUser.balance, win: reward > 0 };
        }

        case "/api/roll_dice": {
            if (currentUser.balance < 10) throw new Error("Недостаточно монет");
            currentUser.balance -= 10;
            currentUser.total_wagered += 10;
            const d1 = 1 + Math.floor(Math.random() * 6);
            const d2 = 1 + Math.floor(Math.random() * 6);
            const total_ = d1 + d2;
            const rewards = { 2: 10, 3: 5, 4: 5, 5: 5, 6: 10, 7: 25, 8: 10, 9: 10, 10: 15, 11: 25, 12: 50 };
            const reward = happyBonus(rewards[total_] || 0);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            addDrop("Кости 🎲", reward - 10, total_ === 12);
            saveDemo();
            return { dice: [d1, d2], total: total_, reward, cost: 10, balance: currentUser.balance, win: reward > 0 };
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
            const reward = happyBonus(body.cells_opened * 6);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            addDrop("Сапёр 💣", reward, false);
            saveDemo();
            return { reward, balance: currentUser.balance };
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
            const cooldown = 60 * 60 * 1000;
            if (now - (currentUser.last_free_case || 0) < cooldown) throw new Error("Ещё не готов");
            const reward = happyBonus(1 + Math.floor(Math.random() * 500));
            currentUser.balance += reward;
            currentUser.cases_opened++;
            currentUser.last_free_case = now;
            if (reward > currentUser.best_drop) currentUser.best_drop = reward;
            addDrop("Бесплатный кейс 🎁", reward, reward > 300);
            saveDemo();
            return { reward, balance: currentUser.balance };
        }
    }
    throw new Error("Unknown API: " + path);
}

function generateFakeLeaderboard() {
    const names = ["Whale", "LuckyKing", "CryptoBoss", "Neon", "ZeroX", "MaxWin", "Flash", "Void", "Nova", "Titan",
        "Ghost", "Ace", "Samurai", "Phantom", "Fury", "Blade", "Storm", "Venom", "Echo", "Frost"];
    const top = names.slice(0, 20).map((n, i) => ({
        rank: i + 1, username: n,
        balance: Math.floor(1000000 / (i + 1) + Math.random() * 50000),
        cases: Math.floor(100 + Math.random() * 900),
    }));
    top[3] = { rank: 4, username: currentUser.username || "Ты", balance: currentUser.balance, cases: currentUser.cases_opened };
    top.sort((a, b) => b.balance - a.balance);
    top.forEach((u, i) => u.rank = i + 1);
    return top;
}

function addDrop(label, delta, jackpot = false) {
    currentUser.drops.unshift({
        label, delta, jackpot, ts: Date.now(),
        user: currentUser.username || "Ты",
    });
    if (currentUser.drops.length > 20) currentUser.drops.length = 20;
    renderDropsFeed();
}

// ============================================================
//                    ИНИЦИАЛИЗАЦИЯ
// ============================================================
async function bootstrap() {
    // 1. Загружаем локальное состояние
    Object.assign(currentUser, loadDemo());

    // Заполняем данные пользователя из Telegram
    const u = tg.initDataUnsafe?.user || {};
    if (!currentUser.id) {
        currentUser.id = u.id || 1;
        currentUser.first_name = u.first_name || "Игрок";
        currentUser.last_name = u.last_name || "";
        currentUser.username = u.username || "demo_user";
        currentUser.rank = 4;
        currentUser.total_users = 20;
        currentUser.ref_link = `https://t.me/demo_bot?start=${currentUser.id}`;
    }

    // 2. Рендер всего UI — НЕЗАВИСИМО от API
    try {
        buildCases();
        buildStarCases();
        buildCarouselDots();
        buildTopUpOptions();
        buildShopGrid();
        buildWheel();
        bindCarouselSwipe();
        bindSaperLevels();
        renderProfile();
        renderDropsFeed();
        startFreeCaseTimer();
    } catch (e) {
        console.error("Build error:", e);
        toast("Ошибка инициализации: " + e.message, "error", 5000);
    }

    // 3. Прячем лоадер — что бы ни случилось
    document.getElementById("global-loader").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    // 4. Синхронизация с API (не критична)
    try { await loadMe(); } catch(e) { console.warn("loadMe:", e); }
    try { await loadLeaderboard(); } catch(e) { console.warn("leaderboard:", e); }
}

function renderProfile() {
    const u = tg.initDataUnsafe?.user || {};
    const initials = (u.first_name || currentUser.first_name || "U").charAt(0);

    const avatarEl = document.getElementById("profile-avatar");
    if (avatarEl) {
        avatarEl.src = currentUser.avatar_url ||
            `https://placehold.co/200x200/06060f/ffd700?text=${encodeURIComponent(initials)}`;
        avatarEl.onerror = () => {
            avatarEl.src = `https://placehold.co/200x200/06060f/ffd700?text=${encodeURIComponent(initials)}`;
        };
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

    document.getElementById("profile-badge").textContent = `#${currentUser.rank} из ${currentUser.total_users}`;
    document.getElementById("profile-cases").textContent = currentUser.cases_opened;
    document.getElementById("profile-stars").textContent = currentUser.stars_spent;
    document.getElementById("profile-refs").textContent = currentUser.referrals;
    document.getElementById("ref-link").textContent = currentUser.ref_link || "—";

    document.getElementById("home-cases").textContent = currentUser.cases_opened;
    document.getElementById("home-wagered").textContent = formatNum(currentUser.total_wagered);
    document.getElementById("home-best").textContent = formatNum(currentUser.best_drop);

    setBalance(currentUser.balance, false);
}

function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n;
}

async function loadMe() {
    const data = await apiCall("/api/me");
    if (!DEMO) {
        Object.assign(currentUser, data);
    }
    renderProfile();
    const happy = data.happy_hours;
    const banner = document.getElementById("happy-banner");
    if (banner) banner.style.display = happy ? "flex" : "none";
}

async function loadLeaderboard() {
    try {
        const { top } = await apiCall("/api/leaderboard");
        const box = document.getElementById("leaderboard-list");
        if (!box) return;
        box.innerHTML = top.map(u => {
            const isMe = u.username === (currentUser.username || "Ты");
            const cls = u.rank === 1 ? "gold" : u.rank === 2 ? "silver" : u.rank === 3 ? "bronze" : "";
            return `<div class="leader-row ${isMe ? 'me' : ''}">
                <div class="leader-rank ${cls}">#${u.rank}</div>
                <div class="leader-name">${isMe ? '⭐ ' : ''}${u.username}</div>
                <div class="leader-balance">${u.balance.toLocaleString("ru-RU")} 🪙</div>
            </div>`;
        }).join("");
    } catch (_) {}
}

function setBalance(v, animate = true) {
    currentUser.balance = v;
    const coinsEl = document.getElementById("coins");
    if (coinsEl) coinsEl.textContent = v.toLocaleString("ru-RU");
    const prof = document.getElementById("profile-balance");
    if (prof) prof.textContent = v.toLocaleString("ru-RU");
    if (animate) {
        const pill = document.getElementById("balance-pill");
        if (pill) { pill.classList.add("bump"); setTimeout(() => pill.classList.remove("bump"), 300); }
    }
    saveDemo();
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
    haptic("light");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll(".nav-btn").forEach(btn =>
    btn.addEventListener("click", () => {
        closeGameView();
        switchTab(btn.dataset.tab);
    })
);

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
    resetSaper();
}

function resetSaper() {
    const setup = document.getElementById("saper-setup");
    const play = document.getElementById("saper-play");
    if (setup) setup.classList.remove("hidden");
    if (play) play.classList.add("hidden");
    const grid = document.getElementById("saper-grid");
    if (grid) grid.innerHTML = "";
    const res = document.getElementById("saper-result");
    if (res) { res.textContent = ""; res.className = "game-result"; }
}

// ============================================================
//                    CAROUSEL
// ============================================================
let currentSlide = 0;
let carouselTimer = null;

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
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
    document.querySelectorAll("#carousel-dots i").forEach((d, idx) =>
        d.classList.toggle("active", idx === currentSlide)
    );
}
function nextSlide() { showSlide(currentSlide + 1); startCarouselAuto(); }
function prevSlide() { showSlide(currentSlide - 1); startCarouselAuto(); }
function startCarouselAuto() {
    if (carouselTimer) clearInterval(carouselTimer);
    carouselTimer = setInterval(() => showSlide(currentSlide + 1), 6000);
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
//                    CASES
// ============================================================
const CASE_COSTS = { "10": 10, "50": 50, "250": 250, "1000": 1000, "5000": 5000, "10000": 10000 };

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

const RARITIES = [
    { key: "common",    weight: 40, label: "Обычный", emoji: "📦" },
    { key: "uncommon",  weight: 25, label: "Хороший", emoji: "✨" },
    { key: "rare",      weight: 18, label: "Редкий",  emoji: "💎" },
    { key: "epic",      weight: 12, label: "Эпик",    emoji: "🔥" },
    { key: "legendary", weight: 4,  label: "Легенда", emoji: "👑" },
    { key: "jackpot",   weight: 1,  label: "JACKPOT", emoji: "🌟" },
];

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
    const caseData = COIN_CASES.find(c => c.id === caseId);
    if (!caseData) return;
    if (currentUser.balance < caseData.price) {
        toast("Недостаточно монет", "error"); hapticNotify("error"); return;
    }
    await runCaseAnimation(`Кейс «${caseData.name}»`, () =>
        apiCall("/api/open_case", { case_id: caseId })
    );
}

async function openStarCase(starId) {
    if (state.caseOpening) return;
    const caseData = STAR_CASES.find(c => c.id === starId);
    if (!caseData) return;

    if (DEMO) {
        const coinsPrice = caseData.price * 10;
        if (currentUser.balance < coinsPrice) {
            toast(`Нужно ${coinsPrice} 🪙 (демо-курс 1⭐=10🪙)`, "error");
            hapticNotify("error"); return;
        }
        await runCaseAnimation(`⭐ «${caseData.name}» · ${caseData.price}⭐`, () =>
            apiCall("/api/open_star_case", { stars: caseData.price })
        );
    } else {
        toast("Звёздные кейсы — в боте ⭐", "info");
    }
}

async function runCaseAnimation(title, apiFn) {
    state.caseOpening = true;
    haptic("medium");

    const WINNER_INDEX = 50;
    const reel = document.getElementById("case-reel");
    const titleEl = document.getElementById("case-modal-title");
    if (titleEl) titleEl.textContent = title;
    reel.innerHTML = "";
    reel.style.transition = "none";
    reel.style.transform = "translateX(0)";

    const items = [];
    for (let i = 0; i < 60; i++) items.push(pickRandomRarity());
    items[WINNER_INDEX] = { ...pickRandomRarity(), label: "?" };

    items.forEach(it => {
        const div = document.createElement("div");
        div.className = `case-item r-${it.key}`;
        div.innerHTML = `${it.emoji}<small>${it.label}</small>`;
        reel.appendChild(div);
    });

    document.getElementById("case-modal").classList.remove("hidden");
    document.getElementById("case-modal-result").innerHTML = "&nbsp;";

    const wrap = document.querySelector(".case-reel-wrap");
    const wrapWidth = wrap.clientWidth;
    const itemWidth = 110 + 8;
    const targetX = -(WINNER_INDEX * itemWidth + itemWidth / 2 - wrapWidth / 2);
    const jitter = (Math.random() - 0.5) * (itemWidth * 0.5);
    const finalX = targetX + jitter;

    await new Promise(r => setTimeout(r, 60));
    reel.style.transition = "transform 6s cubic-bezier(0.12, 0.9, 0.15, 1)";
    reel.style.transform = `translateX(${finalX}px)`;

    let result;
    try { result = await apiFn(); }
    catch (e) {
        toast(e.message, "error");
        document.getElementById("case-modal").classList.add("hidden");
        state.caseOpening = false;
        return;
    }

    setTimeout(() => {
        const resEl = document.getElementById("case-modal-result");
        if (result.win) {
            const isJackpot = result.jackpot;
            resEl.innerHTML = `
                <span style="color:${isJackpot ? '#ff3b5b' : '#ffd700'};text-shadow:0 0 30px currentColor">
                    ${isJackpot ? "🎉 JACKPOT!" : "🏆 ПОБЕДА!"}<br>
                    +${result.reward.toLocaleString("ru-RU")} 🪙
                </span>
                <div style="margin-top:12px;font-size:13px;color:#8a8aa0">
                    x${result.multiplier} · RTP ${(result.rtp * 100).toFixed(0)}%
                </div>`;
            hapticNotify("success");
        } else {
            resEl.innerHTML = `<span style="color:#ff3b5b">💔 Проигрыш · 0 🪙</span>`;
            hapticNotify("error");
        }
        setBalance(result.balance);
        renderProfile();
        setTimeout(() => {
            document.getElementById("case-modal").classList.add("hidden");
            state.caseOpening = false;
        }, 2600);
    }, 6100);
}

// ============================================================
//                    БЕСПЛАТНЫЙ КЕЙС
// ============================================================
let freeCaseTimerId = null;

function startFreeCaseTimer() {
    if (freeCaseTimerId) clearInterval(freeCaseTimerId);
    updateFreeCaseUI();
    freeCaseTimerId = setInterval(updateFreeCaseUI, 1000);
}

function updateFreeCaseUI() {
    const card = document.getElementById("free-case-card");
    const timer = document.getElementById("free-case-timer");
    if (!card || !timer) return;
    const cooldown = 60 * 60 * 1000;
    const diff = Date.now() - (currentUser.last_free_case || 0);
    if (diff >= cooldown) {
        card.classList.remove("disabled");
        timer.textContent = "Готов к открытию!";
        timer.style.color = "var(--gold)";
    } else {
        card.classList.add("disabled");
        const left = cooldown - diff;
        const m = Math.floor(left / 60000);
        const s = Math.floor((left % 60000) / 1000);
        timer.textContent = `Через ${m}м ${s}с`;
        timer.style.color = "var(--text-dim)";
    }
}

async function openFreeCase() {
    if (state.caseOpening) return;
    const cooldown = 60 * 60 * 1000;
    if (Date.now() - (currentUser.last_free_case || 0) < cooldown) {
        toast("Ещё не готов", "error"); return;
    }
    await runCaseAnimation("🎁 Бесплатный кейс", () => apiCall("/api/free_case"));
    renderProfile();
}

// ============================================================
//                    DROPS FEED
// ============================================================
function renderDropsFeed() {
    const box = document.getElementById("drops-feed");
    if (!box) return;
    if (!currentUser.drops || !currentUser.drops.length) {
        box.innerHTML = `<div class="drop-row"><div class="drop-text">Пока пусто. Открой первый кейс!</div></div>`;
        return;
    }
    box.innerHTML = currentUser.drops.slice(0, 10).map(d => {
        const cls = d.delta > 0 ? (d.jackpot ? "jackpot" : "win") : "lose";
        const sign = d.delta > 0 ? "+" : "";
        return `<div class="drop-row">
            <div class="drop-icon">${d.jackpot ? "🌟" : d.delta > 0 ? "🎉" : "💔"}</div>
            <div class="drop-text"><b>${d.user}</b> · ${d.label}</div>
            <div class="drop-value ${cls}">${sign}${d.delta.toLocaleString("ru-RU")} 🪙</div>
        </div>`;
    }).join("");
}

// ============================================================
//                    WHEEL
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

    const seg = 360 / WHEEL_PRIZES.length;
    const targetAngle = 360 * 6 + (360 - (result.index * seg + seg / 2));
    wheelRotation += targetAngle;
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
        state.spinning = false;
        btn.disabled = false;
    }, 5100);
}

// ============================================================
//                    DICE (2 куба)
// ============================================================
const DICE_ROTATIONS = {
    1: { x: 0, y: 0 }, 2: { x: -90, y: 0 }, 3: { x: 0, y: -90 },
    4: { x: 0, y: 90 }, 5: { x: 90, y: 0 }, 6: { x: 0, y: 180 },
};
const DICE_EMOJIS = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function setDiceFace(diceEl, value) {
    const rot = DICE_ROTATIONS[value];
    const extra = 360 * 3;
    diceEl.style.transition = "transform 2.2s cubic-bezier(0.3, 1.2, 0.4, 1)";
    diceEl.style.transform = `rotateX(${rot.x + extra}deg) rotateY(${rot.y + extra}deg)`;
    ["front", "back", "right", "left", "top", "bottom"].forEach((f, i) => {
        const face = diceEl.querySelector(`.dice-face.${f}`);
        if (face) face.textContent = DICE_EMOJIS[i];
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

    setDiceFace(d1el, result.dice[0]);
    setDiceFace(d2el, result.dice[1]);

    setTimeout(() => {
        const e1 = DICE_EMOJIS[result.dice[0] - 1];
        const e2 = DICE_EMOJIS[result.dice[1] - 1];
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
        state.rolling = false;
    }, 2400);
}

// ============================================================
//                    SAPER
// ============================================================
let saperConfig = { size: 5, mines: 5, cost: 25 };

function bindSaperLevels() {
    document.querySelectorAll(".saper-level").forEach(btn => {
        btn.addEventListener("click", () => {
            saperConfig = {
                size: parseInt(btn.dataset.size),
                mines: parseInt(btn.dataset.mines),
                cost: parseInt(btn.dataset.cost),
            };
            startSaperGame();
        });
    });
}

async function startSaperGame() {
    if (currentUser.balance < saperConfig.cost) {
        toast(`Нужно ${saperConfig.cost} 🪙`, "error"); return;
    }
    if (DEMO) {
        currentUser.balance -= saperConfig.cost;
        currentUser.total_wagered += saperConfig.cost;
        setBalance(currentUser.balance, false);
    } else {
        try { await apiCall("/api/saper/start", { cost: saperConfig.cost }); }
        catch (e) { toast(e.message, "error"); return; }
    }
    haptic("medium");

    document.getElementById("saper-setup").classList.add("hidden");
    document.getElementById("saper-play").classList.remove("hidden");

    const grid = document.getElementById("saper-grid");
    grid.style.gridTemplateColumns = `repeat(${saperConfig.size}, 1fr)`;
    grid.innerHTML = "";

    document.getElementById("saper-info").textContent =
        `${saperConfig.size}×${saperConfig.size} · ${saperConfig.mines} мин · +6 🪙 за клетку`;
    const resEl = document.getElementById("saper-result");
    resEl.textContent = ""; resEl.className = "game-result";

    const total = saperConfig.size * saperConfig.size;
    const mines = new Set();
    while (mines.size < saperConfig.mines) mines.add(Math.floor(Math.random() * total));

    let safeOpened = 0;
    const totalSafe = total - saperConfig.mines;

    for (let i = 0; i < total; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.addEventListener("click", async () => {
            if (cell.classList.contains("opened") || cell.classList.contains("mine")) return;

            if (mines.has(i)) {
                cell.textContent = "💣";
                cell.classList.add("mine");
                hapticNotify("error");
                document.querySelectorAll("#saper-grid .cell").forEach((c, idx) => {
                    if (mines.has(idx) && c !== cell) {
                        c.textContent = "💣";
                        c.classList.add("mine");
                    }
                });
                await finishSaper(safeOpened);
            } else {
                cell.textContent = "✅";
                cell.classList.add("opened");
                safeOpened++;
                haptic("light");
                if (safeOpened >= totalSafe) await finishSaper(safeOpened);
            }
        });
        grid.appendChild(cell);
    }
}

async function finishSaper(safeOpened) {
    let result;
    try {
        if (DEMO) {
            const reward = happyBonus(safeOpened * 6);
            currentUser.balance += reward;
            currentUser.cases_opened++;
            addDrop("Сапёр 💣", reward - saperConfig.cost, false);
            saveDemo();
            result = { reward, balance: currentUser.balance };
        } else {
            result = await apiCall("/api/saper/finish", { cells_opened: safeOpened });
        }
    } catch (e) { toast(e.message, "error"); return; }

    const el = document.getElementById("saper-result");
    if (result.reward > 0) {
        el.innerHTML = `<span style="color:#22dd88">✅ +${result.reward} 🪙 (${safeOpened} клеток)</span>`;
        el.classList.add("win");
        hapticNotify("success");
    } else {
        el.innerHTML = `<span style="color:#ff3b5b">💥 Минное поле · 0 🪙</span>`;
        el.classList.add("lose");
    }
    setBalance(result.balance);
    renderProfile();
}

// ============================================================
//                    SHOP
// ============================================================
const TOPUP_OPTIONS = [
    { coins: 100, stars: 10 },
    { coins: 500, stars: 50 },
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
            toast(`🧪 Демо: +${coins} 🪙`, "success", 3000);
            renderProfile();
            closeModal("topup-modal");
            return;
        }
        if (tg.openInvoice) {
            tg.openInvoice(data.invoice_link, (status) => {
                if (status === "paid") {
                    toast("✅ Оплата прошла! Монеты зачислены", "success", 3500);
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
        toast("Введите число от 100 до 100 000", "error"); return;
    }
    closeModal("custom-modal");
    buyCoins(v);
}
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }

// ============================================================
//                    SUPPORT
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
//                    DAILY
// ============================================================
async function claimDaily() {
    const btn = document.getElementById("daily-btn");
    btn.disabled = true;
    try {
        const r = await apiCall("/api/daily");
        setBalance(r.balance);
        toast(`🎁 Ежедневный бонус: +${r.reward} 🪙`, "success", 3500);
        hapticNotify("success");
        renderProfile();
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
        .then(() => toast("📋 Ссылка скопирована", "success"))
        .catch(() => toast("Не удалось скопировать", "error"));
}

// ---------- Старт ----------
if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", bootstrap);
} else {
    bootstrap();
}