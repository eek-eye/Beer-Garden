/* Front page: hero slideshow + badge header helpers (index.html only)
 * Slideshow: autoplay (paused on hover/focus, when the tab is hidden and for reduced motion),
 * circular arrows, dots, keyboard arrows, swipe on touch screens, endless loop (last -> first).
 * Scroll links never put a #hash in the address bar.
 */
(function () {
    'use strict';
    var hero = document.querySelector('.front-hero');
    var NAV_OFFSET = 70; // same offset as the section links in script.js (compact header height)

    function scrollToY(y) {
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }

    function scrollToElement(el) {
        scrollToY(el.getBoundingClientRect().top + window.pageYOffset - NAV_OFFSET);
    }

    // "Tables" links: scroll to the seating chart (href="/" without JavaScript)
    document.querySelectorAll('[data-front-scroll]').forEach(function (link) {
        link.addEventListener('click', function (e) {
            var target = document.getElementById(link.getAttribute('data-front-scroll'));
            if (!target) return;
            e.preventDefault();
            scrollToElement(target);
        });
    });

    // Round badge + brick "up" arrow: back to the top of the page
    document.querySelectorAll('.badge-logo, .front-brick-up').forEach(function (el) {
        el.addEventListener('click', function (e) {
            e.preventDefault();
            scrollToY(0);
        });
    });

    if (!hero) return;
    var slides = Array.prototype.slice.call(hero.querySelectorAll('.front-slide'));
    var dots = Array.prototype.slice.call(hero.querySelectorAll('.front-dot'));
    var count = slides.length;
    if (!count) return;

    var current = 0;
    var timer = null;
    var DELAY = 6500;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hovered = false, focused = false;

    function setInert(el, on) {
        if (on) {
            el.setAttribute('inert', '');
            el.setAttribute('aria-hidden', 'true');
        } else {
            el.removeAttribute('inert');
            el.removeAttribute('aria-hidden');
        }
    }

    function show(index, direction) {
        index = ((index % count) + count) % count; // endless loop in both directions
        if (index === current) return;
        var prev = slides[current];
        prev.classList.remove('is-active', 'from-left', 'from-right');
        prev.classList.add(direction < 0 ? 'leave-right' : 'leave-left');
        setInert(prev, true);
        var next = slides[index];
        next.classList.remove('leave-left', 'leave-right', 'from-left', 'from-right');
        next.classList.add(direction < 0 ? 'from-left' : 'from-right');
        void next.offsetWidth; // restart the entrance animation
        next.classList.add('is-active');
        setInert(next, false);
        dots.forEach(function (d, i) {
            d.classList.toggle('is-active', i === index);
            if (i === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
        });
        setTimeout(function () { prev.classList.remove('leave-left', 'leave-right'); }, 900);
        current = index;
        hero.setAttribute('data-slide', String(index + 1));
    }

    function nextSlide() { show(current + 1, 1); }
    function prevSlide() { show(current - 1, -1); }

    function stop() {
        if (timer) { clearInterval(timer); timer = null; }
    }

    function start() {
        stop();
        if (reduceMotion || hovered || focused || document.hidden) return;
        timer = setInterval(nextSlide, DELAY);
    }

    slides.forEach(function (s, i) { setInert(s, i !== 0); });
    hero.setAttribute('data-slide', '1');

    hero.querySelector('.front-next').addEventListener('click', function () { nextSlide(); start(); });
    hero.querySelector('.front-prev').addEventListener('click', function () { prevSlide(); start(); });
    dots.forEach(function (d, i) {
        d.addEventListener('click', function () { show(i, i < current ? -1 : 1); start(); });
    });

    hero.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { nextSlide(); start(); }
        else if (e.key === 'ArrowLeft') { prevSlide(); start(); }
    });

    hero.addEventListener('mouseenter', function () { hovered = true; stop(); });
    hero.addEventListener('mouseleave', function () { hovered = false; start(); });
    hero.addEventListener('focusin', function () { focused = true; stop(); });
    hero.addEventListener('focusout', function (e) {
        if (!hero.contains(e.relatedTarget)) { focused = false; start(); }
    });
    document.addEventListener('visibilitychange', start);

    // Swipe (touch / pen): horizontal drag of 40px or more changes the slide
    var sx = null, sy = null, sid = null;
    hero.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse') return;
        sx = e.clientX; sy = e.clientY; sid = e.pointerId;
    });
    hero.addEventListener('pointerup', function (e) {
        if (sx === null || e.pointerId !== sid) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        sx = sy = sid = null;
        if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            if (dx < 0) nextSlide(); else prevSlide();
            start();
        }
    });
    hero.addEventListener('pointercancel', function () { sx = sy = sid = null; });

    // Tests / debugging
    window.barFrontSlider = { show: function (i) { show(i, i < current ? -1 : 1); }, next: nextSlide, prev: prevSlide, current: function () { return current; }, count: count };

    start();
})();
