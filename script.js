(function() {
    'use strict';

    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ============================================================
    // SNAKE CURSOR
    // ============================================================
    if (isDesktop) {
        const SEGMENTS_COUNT = 24;
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

        document.addEventListener('mousemove', e => {
            if (!active) {
                active = true;
                document.body.classList.add('cursor-hidden');
            }
            mx = e.clientX;
            my = e.clientY;
        });

        function animateSnake() {
            // Head follows mouse fast
            segments[0].x += (mx - segments[0].x) * 0.45;
            segments[0].y += (my - segments[0].y) * 0.45;
            segments[0].el.style.transform = `translate3d(${segments[0].x}px, ${segments[0].y}px, 0)`;

            // Body follows previous
            for (let i = 1; i < segments.length; i++) {
                segments[i].x += (segments[i - 1].x - segments[i].x) * 0.55;
                segments[i].y += (segments[i - 1].y - segments[i].y) * 0.55;
                segments[i].el.style.transform = `translate3d(${segments[i].x}px, ${segments[i].y}px, 0)`;
            }
            requestAnimationFrame(animateSnake);
        }
        animateSnake();

        // Hover scale on head
        const head = segments[0].el;
        document.querySelectorAll('a, button, .product-card, .gallery-row').forEach(el => {
            el.addEventListener('mouseenter', () => head.style.transform += ' scale(1.6)');
            el.addEventListener('mouseleave', () => {});
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
    // REVEAL
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
        document.querySelectorAll('.section, .cta-final, .gallery-row, .product-card, .roadmap-item, .dev-card').forEach(el => io.observe(el));
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
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && privacyModal.classList.contains('open')) closePrivacy();
        });
    }

    // ============================================================
    // SMOOTH ANCHOR
    // ============================================================
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const id = a.getAttribute('href');
            if (!id || id === '#' || id.length < 2 || id === '#privacy') return;
            const t = document.querySelector(id);
            if (t) {
                e.preventDefault();
                t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

})();