/* Front page: hero slideshow + badge header helpers (index.html only)
 * Slideshow: autoplay (paused on hover/focus, when the tab is hidden and for reduced motion),
 * circular arrows, dots, keyboard arrows, swipe on touch screens, endless loop (last -> first).
 * Scroll links never put a #hash in the address bar.
 */
(function () {
    'use strict';
    var hero = document.querySelector('.front-hero');
    // same offset as the section links in script.js: compact header (70px) + the tiled roof (--roof-h in styles.css)
    function navOffset() {
        return 70 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--roof-h')) || 0);
    }

    function scrollToY(y) {
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }

    function scrollToElement(el) {
        scrollToY(el.getBoundingClientRect().top + window.pageYOffset - navOffset());
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

/* Reviews row (#reviews): scroll-snap track, swipe is native scrolling.
 * The arrows scroll one card at a time and are disabled at either end. */
(function () {
    'use strict';
    var box = document.querySelector('.reviews-slider');
    if (!box) return;
    var track = box.querySelector('.reviews-track');
    var prev = box.querySelector('.reviews-prev');
    var next = box.querySelector('.reviews-next');
    if (!track || !prev || !next) return;

    function step() {
        var card = track.querySelector('.review-card');
        if (!card) return track.clientWidth;
        var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
        return card.getBoundingClientRect().width + gap;
    }

    function update() {
        var max = track.scrollWidth - track.clientWidth - 2;
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft >= max;
    }

    prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    track.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); track.scrollBy({ left: step(), behavior: 'smooth' }); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); track.scrollBy({ left: -step(), behavior: 'smooth' }); }
    });
    var t = null;
    track.addEventListener('scroll', function () {
        if (t) return;
        t = setTimeout(function () { t = null; update(); }, 80);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
})();

/* Gallery (#galeria): masonry of nightlife photos + lightbox in a native <dialog>.
 * Opens on click / Enter; Esc, the × button or a click outside the photo closes it;
 * arrows, keyboard ←/→ and swipe change the photo (endless loop). The address never changes. */
(function () {
    'use strict';
    var grid = document.querySelector('.gallery-grid');
    var box = document.getElementById('galleryLightbox');
    if (!grid || !box || typeof box.showModal !== 'function') return;
    var items = Array.prototype.slice.call(grid.querySelectorAll('.gallery-item'));
    var img = box.querySelector('.lightbox-img');
    var text = box.querySelector('.lightbox-text');
    var countEl = box.querySelector('.lightbox-count');
    var count = items.length;
    var current = 0;
    var opener = null;
    if (!count) return;

    function thumb(i) { return items[i].querySelector('img'); }

    function render(i) {
        current = ((i % count) + count) % count;
        var t = thumb(current);
        img.removeAttribute('loading');
        img.src = t.getAttribute('src');
        img.alt = t.alt;
        img.setAttribute('width', t.getAttribute('width'));
        img.setAttribute('height', t.getAttribute('height'));
        text.textContent = items[current].querySelector('figcaption').textContent;
        countEl.textContent = (current + 1) + ' / ' + count;
        img.style.animation = 'none';
        void img.offsetWidth; // replay the fade-in
        img.style.animation = '';
        [current + 1, current - 1].forEach(function (n) { // warm up the neighbours
            var pre = new Image();
            pre.src = thumb(((n % count) + count) % count).getAttribute('src');
        });
    }

    function open(i) {
        opener = document.activeElement;
        render(i);
        document.documentElement.classList.add('lightbox-open');
        box.showModal();
        box.querySelector('.lightbox-close').focus();
    }

    function close() { if (box.open) box.close(); }

    items.forEach(function (it, i) {
        it.querySelector('.gallery-open').addEventListener('click', function () { open(i); });
    });
    box.querySelector('.lightbox-close').addEventListener('click', close);
    box.querySelector('.lightbox-next').addEventListener('click', function () { render(current + 1); });
    box.querySelector('.lightbox-prev').addEventListener('click', function () { render(current - 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); }); // click on the dark area
    box.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); render(current + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); render(current - 1); }
    });
    box.addEventListener('close', function () {
        document.documentElement.classList.remove('lightbox-open');
        if (opener && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
        opener = null;
    });

    // Swipe (touch / pen)
    var sx = null, sy = null, sid = null;
    box.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse') return;
        sx = e.clientX; sy = e.clientY; sid = e.pointerId;
    });
    box.addEventListener('pointerup', function (e) {
        if (sx === null || e.pointerId !== sid) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        sx = sy = sid = null;
        if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2) render(current + (dx < 0 ? 1 : -1));
    });
    box.addEventListener('pointercancel', function () { sx = sy = sid = null; });

    // Tests / debugging
    window.barGallery = { open: open, close: close, next: function () { render(current + 1); }, prev: function () { render(current - 1); }, current: function () { return current; }, count: count, isOpen: function () { return box.open; } };
})();
