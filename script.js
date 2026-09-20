(function() {
    'use strict';

    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ============================================================
    // SNAKE CURSOR
    // ============================================================
    if (isDesktop) {
        const SEGMENTS_COUNT = 22;
        const segments = [];
        let mx = window.innerWidth / 2;
        let my = window.innerHeight / 2;
        let active = false;

        for (let i = 0; i < SEGMENTS_COUNT; i++) {
            const el = document.createElement('div');
            el.className = 'snake-segment' + (i === 0 ? ' snake-head' : '');
            if (i > 0) {
                const scale = 1 - (i / SEGMENTS_COUNT) * 0.85;
                el.style.width = (14 * scale) + 'px';
                el.style.height = (14 * scale) + 'px';
                el.style.margin = `-${(14 * scale) / 2}px 0 0 -${(14 * scale) / 2}px`;
                el.style.opacity = String(Math.max(0.15, 1 - i / SEGMENTS_COUNT));
            }
            document.body.appendChild(el);
            segments.push({ el, x: mx, y: my });
        }

        const head = segments[0].el;

        document.addEventListener('mousemove', e => {
            if (!active) {
                active = true;
                document.body.classList.add('cursor-hidden');
            }
            mx = e.clientX;
            my = e.clientY;
        });

        document.addEventListener('mousedown', () => head.classList.add('clicking'));
        document.addEventListener('mouseup', () => head.classList.remove('clicking'));

        document.querySelectorAll('a, button, .product-card, .gallery-visual, .contact-card, .tech-card, .faq-question, .principle-card, .gyro-stage').forEach(el => {
            el.addEventListener('mouseenter', () => head.classList.add('hover'));
            el.addEventListener('mouseleave', () => head.classList.remove('hover'));
        });

        function animateSnake() {
            segments[0].x += (mx - segments[0].x) * 0.45;
            segments[0].y += (my - segments[0].y) * 0.45;
            segments[0].el.style.transform = `translate3d(${segments[0].x}px, ${segments[0].y}px, 0)`;

            for (let i = 1; i < segments.length; i++) {
                segments[i].x += (segments[i - 1].x - segments[i].x) * 0.55;
                segments[i].y += (segments[i - 1].y - segments[i].y) * 0.55;
                segments[i].el.style.transform = `translate3d(${segments[i].x}px, ${segments[i].y}px, 0)`;
            }
            requestAnimationFrame(animateSnake);
        }
        animateSnake();
    }

    // ============================================================
    // MOUSE TRAIL GLOW
    // ============================================================
    if (isDesktop) {
        const trail = document.getElementById('mouseTrail');
        if (trail) {
            let tx = window.innerWidth / 2, ty = window.innerHeight / 2;
            let gx = tx, gy = ty;

            document.addEventListener('mousemove', e => {
                tx = e.clientX;
                ty = e.clientY;
            });

            function animTrail() {
                gx += (tx - gx) * 0.08;
                gy += (ty - gy) * 0.08;
                trail.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
                requestAnimationFrame(animTrail);
            }
            animTrail();
        }
    }

    // ============================================================
    // GLOBAL CLICK RIPPLE
    // ============================================================
    if (isDesktop) {
        document.addEventListener('click', e => {
            if (e.target.closest('a, button, input, textarea, select, .modal-overlay, .product-card, .faq-question, .contact-card, .tech-card, .principle-card, .gyro-stage')) {
                return;
            }

            const ripple = document.createElement('div');
            ripple.className = 'click-ripple';
            ripple.style.left = e.clientX + 'px';
            ripple.style.top = e.clientY + 'px';
            document.body.appendChild(ripple);

            setTimeout(() => ripple.remove(), 1300);
        });
    }

    // ============================================================
    // SCROLL PROGRESS
    // ============================================================
    const bar = document.getElementById('scrollBar');
    if (bar) {
        function updateScroll() {
            const h = document.documentElement.scrollHeight - window.innerHeight;
            if (h <= 0) return;
            bar.style.width = (window.scrollY / h * 100) + '%';
        }
        window.addEventListener('scroll', updateScroll, { passive: true });
        updateScroll();
    }

    // ============================================================
    // HEADER SHRINK
    // ============================================================
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 100);
        }, { passive: true });
    }

    // ============================================================
    // BURGER MENU
    // ============================================================
    const burger = document.getElementById('burger');
    const mobileMenu = document.getElementById('mobileMenu');
    if (burger && mobileMenu) {
        burger.addEventListener('click', () => {
            burger.classList.toggle('active');
            mobileMenu.classList.toggle('open');
            document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
        });
        mobileMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                burger.classList.remove('active');
                mobileMenu.classList.remove('open');
                document.body.style.overflow = '';
            });
        });
    }

    // ============================================================
    // MAGNETIC BUTTONS
    // ============================================================
    if (isDesktop) {
        document.querySelectorAll('.magnetic').forEach(el => {
            el.addEventListener('mousemove', e => {
                const r = el.getBoundingClientRect();
                const x = e.clientX - r.left - r.width / 2;
                const y = e.clientY - r.top - r.height / 2;
                el.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
            });
        });
    }

    // ============================================================
    // HERO BG TEXT PARALLAX
    // ============================================================
    const heroBgText = document.querySelector('.hero-bg-text');
    if (heroBgText && isDesktop) {
        document.addEventListener('mousemove', e => {
            const x = (e.clientX / window.innerWidth - 0.5) * 40;
            const y = (e.clientY / window.innerHeight - 0.5) * 40;
            heroBgText.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        });
    }

    // ============================================================
    // GYROSCOPE — FOLLOW MOUSE + SCROLL ROTATION + RIPPLE
    // ============================================================
    const gyro = document.getElementById('gyroscope');
    const gyroStage = document.getElementById('gyroStage');
    const gyroRipples = document.getElementById('gyroRipples');

    if (gyro && gyroStage) {
        let rotX = 0, rotY = 0, rotZ = 0;

        function applyGyroTransform() {
            gyro.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`;
        }

        if (isDesktop) {
            gyroStage.addEventListener('mousemove', e => {
                const r = gyroStage.getBoundingClientRect();
                rotY = ((e.clientX - r.left) / r.width - 0.5) * 22;
                rotX = -((e.clientY - r.top) / r.height - 0.5) * 22;
                applyGyroTransform();
            });
            gyroStage.addEventListener('mouseleave', () => {
                rotX = 0;
                rotY = 0;
                applyGyroTransform();
            });
        }

        window.addEventListener('scroll', () => {
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            const progress = Math.min(1, window.scrollY / Math.max(1, maxScroll * 0.4));
            rotZ = progress * 180;
            applyGyroTransform();
        }, { passive: true });

        if (gyroRipples) {
            gyroStage.addEventListener('click', e => {
                if (e.target.closest('a, button')) return;
                const r = gyroStage.getBoundingClientRect();
                const x = e.clientX - r.left;
                const y = e.clientY - r.top;

                const ripple = document.createElement('div');
                ripple.className = 'gyro-ripple-item';
                ripple.style.left = x + 'px';
                ripple.style.top = y + 'px';
                gyroRipples.appendChild(ripple);

                setTimeout(() => ripple.remove(), 1700);
            });
        }
    }

    // ============================================================
    // REVEAL ON SCROLL
    // ============================================================
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('in');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });
        document.querySelectorAll('.section, .cta-final, .gallery-row, .product-card, .roadmap-item, .dev-card, .tech-card, .contact-card, .faq-item, .history-item, .reveal-text, .principle-card').forEach(el => io.observe(el));
    }

    // ============================================================
    // COUNTERS
    // ============================================================
    const counters = document.querySelectorAll('[data-count]');
    if (counters.length && 'IntersectionObserver' in window) {
        const cio = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                const el = e.target;
                const target = parseInt(el.dataset.count, 10);
                let cur = 0;
                const step = Math.max(1, Math.floor(target / 40));
                const tick = () => {
                    cur += step;
                    if (cur >= target) {
                        el.textContent = target.toLocaleString('ru-RU');
                        return;
                    }
                    el.textContent = cur.toLocaleString('ru-RU');
                    requestAnimationFrame(tick);
                };
                tick();
                cio.unobserve(el);
            });
        }, { threshold: 0.5 });
        counters.forEach(el => cio.observe(el));
    }

    // ============================================================
    // PRODUCT MODAL
    // ============================================================
    const PRODUCTS = {
        games: {
            icon: '🎰',
            title: 'LIFELESS Games',
            status: 'live',
            statusText: 'LIVE',
            desc: 'Флагманский продукт компании — игровая экосистема внутри Telegram. Полноценная игровая платформа с экономикой, маркетплейсом подарков и живым сообществом игроков.',
            features: [
                '16 кейсов с реальными подарками Telegram',
                '3 колеса фортуны (обычное, бесплатное, VIP)',
                'Сапёр в двух режимах: монеты и звёзды',
                'Кости и монетка — классические игры удачи',
                'VIP-программа: 5 уровней с бонусами и скидками',
                'Система стриков, квестов и ежедневных наград',
                'Профиль с украшениями: цвета ника, рамки, питомцы',
                'Лидерборд и реферальная программа'
            ],
            eta: null,
            actions: [
                { text: 'Открыть в Telegram', href: 'https://t.me/Solver_Life_bot', primary: true },
                { text: 'Подробнее ниже', href: '#games' }
            ]
        },
        shop: {
            icon: '⭐',
            title: 'LIFELESS Shop',
            status: 'dev',
            statusText: 'В РАЗРАБОТКЕ',
            desc: 'Полноценный магазин Telegram-услуг. Всё, что нужно активному пользователю Telegram — в одном месте, по лучшим ценам и без риска.',
            features: [
                'Telegram Stars по выгодному курсу',
                'Premium-подписки любой длительности',
                'Бусты для каналов и сообществ',
                'Анонимные номера +888 (Fragment)',
                'NFT-подарки и коллекционные items',
                'Автоматическая выдача в течение секунд',
                'Поддержка всех стран СНГ',
                'Безопасные платежи через официальные API'
            ],
            eta: 'Q1 2026',
            actions: [
                { text: 'В разработке', href: '#', disabled: true }
            ]
        },
        osint: {
            icon: '🔍',
            title: 'OSINT Combain',
            status: 'dev',
            statusText: 'В РАЗРАБОТКЕ',
            desc: 'Набор профессиональных инструментов для анализа открытых данных. Создан для журналистов, аналитиков, исследователей и специалистов по безопасности.',
            features: [
                'Поиск по открытым базам и соцсетям',
                'Агрегация данных из множества источников',
                'Визуализация связей и графов',
                'Автоматические отчёты по запросу',
                'API для интеграций',
                'Полностью легальные методы сбора данных',
                'Работа с русскоязычным и зарубежным сегментом',
                'Приватность — все данные обрабатываются локально'
            ],
            eta: 'Q2 2026',
            actions: [
                { text: 'В разработке', href: '#', disabled: true }
            ]
        },
        crypto: {
            icon: '💠',
            title: 'LIFELESS Crypto',
            status: 'dev',
            statusText: 'В РАЗРАБОТКЕ',
            desc: 'Крипто-направление компании. Простые и надёжные сервисы для работы с цифровыми активами — без сложных интерфейсов и непонятных терминов.',
            features: [
                'Мультивалютный кошелёк с поддержкой топ-10 сетей',
                'Встроенный обменник без скрытых комиссий',
                'P2P-платформа для безопасных сделок',
                'DeFi-сервисы для пассивного дохода',
                'Портфельный трекер с аналитикой',
                'Интеграция с Telegram Mini App',
                'Поддержка всех популярных кошельков',
                'Обучение для новичков'
            ],
            eta: 'Q3 2026',
            actions: [
                { text: 'В разработке', href: '#', disabled: true }
            ]
        },
        beyond: {
            icon: '🌐',
            title: 'Beyond Telegram',
            status: 'plan',
            statusText: 'В ПЛАНАХ',
            desc: 'Стратегическое направление — выход за пределы Telegram. Веб-версии продуктов, standalone-приложения, интеграции с другими платформами.',
            features: [
                'Веб-версии всех продуктов',
                'Standalone desktop-приложения',
                'Мобильные приложения для iOS и Android',
                'Открытые API для разработчиков',
                'Интеграции со сторонними платформами',
                'Полноценный личный кабинет',
                'Мультиаккаунт и командная работа',
                'Единая экосистема под брендом LIFELESS'
            ],
            eta: '2026-2027',
            actions: [
                { text: 'В планах', href: '#', disabled: true }
            ]
        }
    };

    const productModal = document.getElementById('productModal');
    const productClose = document.getElementById('productClose');

    function openProductModal(id) {
        const p = PRODUCTS[id];
        if (!p || !productModal) return;

        const statusEl = document.getElementById('mpStatus');
        statusEl.className = 'mp-status ' + p.status;
        statusEl.textContent = p.statusText;

        document.getElementById('mpIcon').textContent = p.icon;
        document.getElementById('mpTitle').textContent = p.title;
        document.getElementById('mpDesc').textContent = p.desc;

        const featuresEl = document.getElementById('mpFeatures');
        featuresEl.innerHTML = p.features.map(f => `<li>${f}</li>`).join('');

        const etaBlock = document.getElementById('mpEtaBlock');
        const etaEl = document.getElementById('mpEta');
        if (p.eta) {
            etaBlock.style.display = 'block';
            etaEl.textContent = '📅 ' + p.eta;
        } else {
            etaBlock.style.display = 'none';
        }

        const actionsEl = document.getElementById('mpActions');
        actionsEl.innerHTML = p.actions.map(a => {
            if (a.disabled) {
                return `<a href="#" class="btn btn-ghost" style="opacity:0.4;pointer-events:none">${a.text}</a>`;
            }
            const cls = a.primary ? 'btn btn-primary' : 'btn btn-ghost';
            return `<a href="${a.href}" target="${a.href.startsWith('http') ? '_blank' : '_self'}" class="${cls}">${a.text} <span class="btn-arrow">→</span></a>`;
        }).join('');

        productModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeProductModal() {
        if (!productModal) return;
        productModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (productModal) {
        document.querySelectorAll('[data-product]').forEach(card => {
            card.addEventListener('click', () => openProductModal(card.dataset.product));
        });
        if (productClose) productClose.addEventListener('click', closeProductModal);
        productModal.addEventListener('click', e => {
            if (e.target === productModal) closeProductModal();
        });
    }

    // ============================================================
    // LIGHTBOX
    // ============================================================
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');

    function openLightbox(src) {
        if (!lightbox || !lightboxImg) return;
        lightboxImg.src = src;
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (lightbox) {
        document.querySelectorAll('[data-img]').forEach(el => {
            el.addEventListener('click', () => openLightbox(el.dataset.img));
        });
        if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', e => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    // ============================================================
    // PRIVACY MODAL
    // ============================================================
    const privacyModal = document.getElementById('privacyModal');
    const privacyClose = document.getElementById('privacyClose');
    if (privacyModal && privacyClose) {
        document.querySelectorAll('a[href="#privacy"]').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                privacyModal.classList.add('open');
                document.body.style.overflow = 'hidden';
            });
        });
        function closePrivacy() {
            privacyModal.classList.remove('open');
            document.body.style.overflow = '';
        }
        privacyClose.addEventListener('click', closePrivacy);
        privacyModal.addEventListener('click', e => {
            if (e.target === privacyModal) closePrivacy();
        });
    }

    // ============================================================
    // FAQ ACCORDION
    // ============================================================
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const wasOpen = item.classList.contains('open');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
            if (!wasOpen) item.classList.add('open');
        });
    });

    // ============================================================
    // ESC KEY CLOSES ANY MODAL
    // ============================================================
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(m => {
                m.classList.remove('open');
            });
            document.body.style.overflow = '';
        }
    });

    // ============================================================
    // STICKY CTA
    // ============================================================
    const stickyCta = document.getElementById('stickyCta');
    if (stickyCta) {
        function updateSticky() {
            const scrolled = window.scrollY;
            const heroHeight = document.querySelector('.hero')?.offsetHeight || window.innerHeight;
            const docHeight = document.documentElement.scrollHeight;
            const nearBottom = scrolled + window.innerHeight > docHeight - 400;
            const hasModal = document.querySelector('.modal-overlay.open') !== null;

            if (scrolled > heroHeight * 0.8 && !nearBottom && !hasModal) {
                stickyCta.classList.add('visible');
            } else {
                stickyCta.classList.remove('visible');
            }
        }
        window.addEventListener('scroll', updateSticky, { passive: true });
        updateSticky();

        const modalObserver = new MutationObserver(() => {
            updateSticky();
        });
        document.querySelectorAll('.modal-overlay').forEach(m => {
            modalObserver.observe(m, { attributes: true, attributeFilter: ['class'] });
        });
    }

    // ============================================================
    // SMOOTH ANCHOR
    // ============================================================
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const id = a.getAttribute('href');
            if (!id || id === '#' || id.length < 2) return;
            if (id === '#privacy') return;
            const t = document.querySelector(id);
            if (t) {
                e.preventDefault();
                t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ============================================================
    // ACTIVE NAV HIGHLIGHT
    // ============================================================
    if ('IntersectionObserver' in window) {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('nav a[href^="#"]');
        const navIO = new IntersectionObserver(entries => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const id = e.target.id;
                    navLinks.forEach(l => {
                        l.style.color = l.getAttribute('href') === '#' + id ? 'var(--gold)' : '';
                    });
                }
            });
        }, { threshold: 0.3 });
        sections.forEach(s => navIO.observe(s));
    }
    // ============================================================
    // TERMINAL TYPING
    // ============================================================
    const termEl = document.getElementById('terminalBody');
    if (termEl) {
        const LINES = [
            { t: 'prompt', s: '$ lifeless --boot --verbose' },
            { t: 'comment', s: '# инициализация ядра...' },
            { t: 'ok', s: '✓ SQLite WAL loaded · 14.2 MB' },
            { t: 'ok', s: '✓ aiogram 3 dispatcher ready' },
            { t: 'ok', s: '✓ FastAPI mounted at /api/v1' },
            { t: 'ok', s: '✓ HMAC verifier · 32-byte secret' },
            { t: 'warn', s: '⚠  Cloudflare tunnel: warmup 1.2s' },
            { t: 'ok', s: '✓ Gift API · connected' },
            { t: 'ok', s: '✓ Stars payment · connected' },
            { t: 'prompt', s: '$ lifeless --status' },
            { t: 'comment', s: '' },
            { t: 'ok', s: '  services  : 12/12 online' },
            { t: 'ok', s: '  uptime    : 184 days' },
            { t: 'ok', s: '  players   : 5,000+' },
            { t: 'ok', s: '  errors/h  : 0.02' },
            { t: 'prompt', s: '$ _' }
        ];

        let li = 0, ci = 0;
        const cursorSpan = '<span class="terminal-cursor"></span>';

        function typeNext() {
            if (li >= LINES.length) return;
            const line = LINES[li];
            const text = line.s;

            if (ci === 0) {
                const wrap = document.createElement('div');
                wrap.dataset.t = line.t;
                wrap.className = line.t;
                termEl.appendChild(wrap);
            }

            const current = termEl.lastChild;
            if (ci <= text.length) {
                current.innerHTML = text.slice(0, ci) + cursorSpan;
                ci++;
                const delay = text[ci - 1] === ' ' ? 12 : (18 + Math.random() * 26);
                setTimeout(typeNext, delay);
            } else {
                current.innerHTML = text;
                li++;
                ci = 0;
                setTimeout(typeNext, text === '' ? 80 : 220);
            }
        }
        // Запуск при появлении в зоне видимости
        if ('IntersectionObserver' in window) {
            const tio = new IntersectionObserver((es) => {
                es.forEach(e => {
                    if (e.isIntersecting) {
                        tio.disconnect();
                        setTimeout(typeNext, 300);
                    }
                });
            }, { threshold: 0.3 });
            tio.observe(termEl);
        } else {
            setTimeout(typeNext, 300);
        }
    }

    // ============================================================
    // NEURAL WEB (canvas constellation)
    // ============================================================
    const neuralCanvas = document.getElementById('neuralCanvas');
    if (neuralCanvas) {
        const ctx = neuralCanvas.getContext('2d');
        let nw = 0, nh = 0, dpr = 1;
        const NODES = [];
        const N = 44;

        function nresize() {
            const r = neuralCanvas.getBoundingClientRect();
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            nw = r.width; nh = r.height;
            neuralCanvas.width = nw * dpr;
            neuralCanvas.height = nh * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function seed() {
            NODES.length = 0;
            for (let i = 0; i < N; i++) {
                NODES.push({
                    x: Math.random() * nw,
                    y: Math.random() * nh,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    r: 1 + Math.random() * 2.2,
                    hue: Math.random() < 0.15 ? 'violet' : 'gold'
                });
            }
        }

        nresize(); seed();

        const mouse = { x: -9999, y: -9999 };
        neuralCanvas.addEventListener('mousemove', (e) => {
            const r = neuralCanvas.getBoundingClientRect();
            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;
        });
        neuralCanvas.addEventListener('mouseleave', () => {
            mouse.x = -9999; mouse.y = -9999;
        });

        let nRaf = null;
        function nframe() {
            ctx.clearRect(0, 0, nw, nh);

            // связи узлов
            for (let i = 0; i < N; i++) {
                for (let j = i + 1; j < N; j++) {
                    const a = NODES[i], b = NODES[j];
                    const dx = a.x - b.x, dy = a.y - b.y;
                    const d = Math.hypot(dx, dy);
                    if (d < 150) {
                        const alpha = (1 - d / 150) * 0.35;
                        ctx.strokeStyle = `rgba(228,185,99,${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            // узлы
            NODES.forEach(n => {
                n.x += n.vx; n.y += n.vy;
                if (n.x < 0 || n.x > nw) n.vx *= -1;
                if (n.y < 0 || n.y > nh) n.vy *= -1;

                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                if (n.hue === 'violet') {
                    ctx.fillStyle = 'rgba(179,152,255,0.95)';
                    ctx.shadowColor = 'rgba(179,152,255,0.9)';
                } else {
                    ctx.fillStyle = 'rgba(247,216,150,0.95)';
                    ctx.shadowColor = 'rgba(228,185,99,0.9)';
                }
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            });

            // связи с мышью
            if (mouse.x > -1000) {
                NODES.forEach(n => {
                    const d = Math.hypot(n.x - mouse.x, n.y - mouse.y);
                    if (d < 190) {
                        ctx.strokeStyle = `rgba(247,216,150,${(1 - d / 190) * 0.55})`;
                        ctx.lineWidth = 0.9;
                        ctx.beginPath();
                        ctx.moveTo(n.x, n.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                });
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.shadowColor = '#E4B963';
                ctx.shadowBlur = 15;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            nRaf = requestAnimationFrame(nframe);
        }
        nframe();

        let nRT;
        window.addEventListener('resize', () => {
            clearTimeout(nRT);
            nRT = setTimeout(() => { nresize(); seed(); }, 200);
        });

        // Пауза, когда не видно
        if ('IntersectionObserver' in window) {
            const vio = new IntersectionObserver((es) => {
                es.forEach(e => {
                    if (e.isIntersecting) { if (!nRaf) nframe(); }
                    else { cancelAnimationFrame(nRaf); nRaf = null; }
                });
            }, { threshold: 0 });
            vio.observe(neuralCanvas);
        }
    }

    // ============================================================
    // WAVEFORM (звуковая волна · RPS-поток)
    // ============================================================
    const waveCanvas = document.getElementById('waveCanvas');
    if (waveCanvas) {
        const wctx = waveCanvas.getContext('2d');
        let ww = 0, wh = 0;
        const POINTS = 180;
        const values = new Array(POINTS).fill(0);
        let head = 0;

        function wresize() {
            const r = waveCanvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            ww = r.width; wh = r.height;
            waveCanvas.width = ww * dpr;
            waveCanvas.height = wh * dpr;
            wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        wresize();

        function nextVal() {
            // Имитация RPS: base 40 + шум + редкие всплески
            const base = 0.35;
            const noise = (Math.random() - 0.5) * 0.5;
            const spike = Math.random() < 0.03 ? (Math.random() * 0.6) : 0;
            return Math.max(0.05, Math.min(1, base + noise * 0.4 + spike));
        }

        function wframe() {
            values[head] = nextVal();
            head = (head + 1) % POINTS;

            wctx.clearRect(0, 0, ww, wh);
            const mid = wh / 2;

            // градиент
            const grad = wctx.createLinearGradient(0, 0, ww, 0);
            grad.addColorStop(0, 'rgba(228,185,99,0.05)');
            grad.addColorStop(0.5, 'rgba(247,216,150,0.9)');
            grad.addColorStop(1, 'rgba(228,185,99,0.05)');

            // верхняя и нижняя волна
            for (let side = -1; side <= 1; side += 2) {
                wctx.beginPath();
                for (let i = 0; i < POINTS; i++) {
                    const idx = (head + i) % POINTS;
                    const v = values[idx];
                    const x = (i / (POINTS - 1)) * ww;
                    const y = mid + side * v * (wh * 0.42);
                    if (i === 0) wctx.moveTo(x, y);
                    else wctx.lineTo(x, y);
                }
                wctx.strokeStyle = grad;
                wctx.lineWidth = 1.4;
                wctx.stroke();
            }

            // заполнение
            wctx.beginPath();
            wctx.moveTo(0, mid);
            for (let i = 0; i < POINTS; i++) {
                const idx = (head + i) % POINTS;
                const v = values[idx];
                const x = (i / (POINTS - 1)) * ww;
                wctx.lineTo(x, mid - v * (wh * 0.42));
            }
            for (let i = POINTS - 1; i >= 0; i--) {
                const idx = (head + i) % POINTS;
                const v = values[idx];
                const x = (i / (POINTS - 1)) * ww;
                wctx.lineTo(x, mid + v * (wh * 0.42));
            }
            wctx.closePath();
            const fillGrad = wctx.createLinearGradient(0, 0, 0, wh);
            fillGrad.addColorStop(0, 'rgba(228,185,99,0.0)');
            fillGrad.addColorStop(0.5, 'rgba(228,185,99,0.15)');
            fillGrad.addColorStop(1, 'rgba(228,185,99,0.0)');
            wctx.fillStyle = fillGrad;
            wctx.fill();

            requestAnimationFrame(wframe);
        }
        wframe();

        let wRT;
        window.addEventListener('resize', () => {
            clearTimeout(wRT);
            wRT = setTimeout(wresize, 200);
        });
    }

    // ============================================================
    // PRISM — реагирует на движение мыши (лёгкий параллакс)
    // ============================================================
    const prismStage = document.querySelector('.prism-stage');
    if (prismStage && isDesktop) {
        const prismSvg = prismStage.querySelector('.prism-svg');
        if (prismSvg) {
            prismStage.addEventListener('mousemove', (e) => {
                const r = prismStage.getBoundingClientRect();
                const x = ((e.clientX - r.left) / r.width - 0.5) * 20;
                const y = ((e.clientY - r.top) / r.height - 0.5) * 20;
                prismSvg.style.transform = `translate(${x}px, ${y}px) scale(1.03)`;
                prismSvg.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
            });
            prismStage.addEventListener('mouseleave', () => {
                prismSvg.style.transform = '';
            });
        }
    }

    // ============================================================
    // MANIFEST — вертикальный прогресс рельсы
    // ============================================================
    const manifestRail = document.querySelector('.manifest-rail');
    if (manifestRail) {
        const sections = document.querySelectorAll('.manifest-section');
        if ('IntersectionObserver' in window && sections.length) {
            const rio = new IntersectionObserver((es) => {
                es.forEach(e => {
                    if (e.isIntersecting) {
                        const n = e.target.querySelector('.manifest-num')?.textContent?.trim();
                        const railNum = manifestRail.querySelector('.manifest-rail-num');
                        if (railNum && n) railNum.textContent = '§ ' + n;
                    }
                });
            }, { threshold: 0.4 });
            sections.forEach(s => rio.observe(s));
        }
    }
    // ============================================================
    // NEXUS — интерактивный граф навигации
    // ============================================================
    const nexus = document.getElementById('nexus');
    if (nexus) {
        const CONNECTIONS = {
            center:     ['bot', 'manifest', 'technology', 'roadmap', 'games', 'products'],
            bot:        ['center', 'manifest', 'products', 'technology'],
            manifest:   ['center', 'bot', 'technology', 'products'],
            technology: ['center', 'manifest', 'bot', 'games', 'roadmap'],
            roadmap:    ['center', 'technology', 'games', 'products'],
            games:      ['center', 'roadmap', 'products', 'technology'],
            products:   ['center', 'games', 'bot', 'manifest', 'roadmap']
        };

        const allNodes = nexus.querySelectorAll('.nexus-node');
        const allEdges = nexus.querySelectorAll('.nexus-edges line');

        allNodes.forEach(node => {
            const id = node.dataset.node;
            if (!id) return;
            const connected = CONNECTIONS[id] || [];

            node.addEventListener('mouseenter', () => {
                nexus.classList.add('dimmed');
                node.classList.add('active');

                allEdges.forEach(edge => {
                    if (edge.dataset.from === id || edge.dataset.to === id) {
                        edge.classList.add('active');
                    }
                });

                allNodes.forEach(n => {
                    if (connected.includes(n.dataset.node)) {
                        n.classList.add('connected');
                    }
                });
            });

            node.addEventListener('mouseleave', () => {
                nexus.classList.remove('dimmed');
                node.classList.remove('active');

                allEdges.forEach(edge => edge.classList.remove('active'));
                allNodes.forEach(n => n.classList.remove('connected'));
            });
        });

        // Плавный скролл для узлов, ведущих на якоря
        nexus.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', e => {
                const href = a.getAttribute('href');
                if (!href || href === '#') return;
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }
})();