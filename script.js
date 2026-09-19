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

        // Hover effect on interactive
        document.querySelectorAll('a, button, .product-card, .gallery-visual, .contact-card, .blog-card, .tech-card, .faq-question').forEach(el => {
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
    // TILT CARDS
    // ============================================================
    if (isDesktop) {
        document.querySelectorAll('.tilt').forEach(el => {
            el.addEventListener('mousemove', e => {
                const r = el.getBoundingClientRect();
                const x = (e.clientX - r.left) / r.width - 0.5;
                const y = (e.clientY - r.top) / r.height - 0.5;
                el.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
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
    // GYROSCOPE FOLLOW MOUSE
    // ============================================================
    const gyro = document.querySelector('.gyroscope');
    if (gyro && isDesktop) {
        const parent = gyro.parentElement;
        parent.addEventListener('mousemove', e => {
            const r = parent.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            gyro.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 18}deg)`;
        });
        parent.addEventListener('mouseleave', () => {
            gyro.style.transform = '';
        });
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
        document.querySelectorAll('.section, .cta-final, .gallery-row, .product-card, .roadmap-item, .dev-card, .review-card, .blog-card, .tech-card, .contact-card, .faq-item, .history-item, .reveal-text').forEach(el => io.observe(el));
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
                        el.textContent = target;
                        return;
                    }
                    el.textContent = cur;
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
                'Голда и бусты для каналов',
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

})();