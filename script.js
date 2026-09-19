(function() {
    'use strict';

    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // ============================================================
    // CURSOR
    // ============================================================
    const dot = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    const glow = document.getElementById('cursor-glow');

    if (isDesktop && dot && ring && glow) {
        let mx = window.innerWidth / 2, my = window.innerHeight / 2;
        let dx = mx, dy = my;
        let rx = mx, ry = my;
        let gx = mx, gy = my;
        let active = false;

        document.addEventListener('mousemove', e => {
            if (!active) {
                active = true;
                document.body.classList.add('cursor-hidden');
            }
            mx = e.clientX;
            my = e.clientY;
        });

        function animCursor() {
            dx += (mx - dx) * 0.6;
            dy += (my - dy) * 0.6;
            rx += (mx - rx) * 0.15;
            ry += (my - ry) * 0.15;
            gx += (mx - gx) * 0.06;
            gy += (my - gy) * 0.06;

            dot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
            ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
            glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;

            requestAnimationFrame(animCursor);
        }
        animCursor();

        document.querySelectorAll('a, button, .tilt, .gallery-item, .feature, .btn').forEach(el => {
            el.addEventListener('mouseenter', () => ring.classList.add('hover'));
            el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
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
        document.querySelectorAll('.reveal, .section, .hero-inner > *').forEach(el => io.observe(el));
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
    // SMOOTH ANCHOR
    // ============================================================
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const id = a.getAttribute('href');
            if (!id || id === '#' || id.length < 2) return;
            const t = document.querySelector(id);
            if (t) {
                e.preventDefault();
                t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

})();