/* Cookie consent for barchinesca.club (hand-written, no third-party service)
 *
 * Essential (always on, no consent needed): Firebase Authentication + Cloud Firestore
 * (sign-in session and reservations), the copy of your profile kept in local storage,
 * the section-to-scroll-to in session storage, and this choice itself.
 * Optional (only after "Aceptar / Accept"): the decorative Google Fonts
 * (Noto Serif SC, Ma Shan Zheng). Without consent the site uses the fonts already on the device.
 * There are no analytics, ads, maps or social embeds (Maps / Facebook / Instagram are plain links).
 *
 * Choice: localStorage "barCookieConsent" = {"v":1,"choice":"all"|"essential","at":"<ISO date>"}.
 * Reopen: any element with data-cookie-settings (footer "Cookies" link, privacy page button),
 * or window.barCookieConsent.open().
 */
(function () {
    'use strict';
    var KEY = 'barCookieConsent';
    var OPTIONAL_FONTS = [
        'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700;900&display=swap',
        'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&text=%E9%85%92%E5%90%A7%E7%A6%8F&display=swap'
    ];

    function readChoice() {
        try {
            var v = JSON.parse(localStorage.getItem(KEY) || 'null');
            return v && (v.choice === 'all' || v.choice === 'essential') ? v.choice : null;
        } catch (e) {
            return null;
        }
    }

    function saveChoice(choice) {
        try {
            localStorage.setItem(KEY, JSON.stringify({ v: 1, choice: choice, at: new Date().toISOString() }));
        } catch (e) { /* storage blocked: the banner simply shows again next time */ }
    }

    function addLink(rel, href, crossorigin) {
        var l = document.createElement('link');
        l.rel = rel;
        l.href = href;
        if (crossorigin) l.crossOrigin = 'anonymous';
        l.setAttribute('data-cookie-optional', 'fonts');
        document.head.appendChild(l);
    }

    function loadOptional() {
        if (document.querySelector('link[data-cookie-optional]')) return;
        addLink('preconnect', 'https://fonts.googleapis.com');
        addLink('preconnect', 'https://fonts.gstatic.com', true);
        OPTIONAL_FONTS.forEach(function (href) { addLink('stylesheet', href); });
    }

    function unloadOptional() {
        var links = document.querySelectorAll('link[data-cookie-optional]');
        for (var i = 0; i < links.length; i++) links[i].parentNode.removeChild(links[i]);
    }

    // Runs in <head>: if the visitor already accepted, the fonts start loading right away
    if (readChoice() === 'all') loadOptional();

    var banner = null;

    function statusText(choice) {
        if (choice === 'all') return 'Elección actual: aceptadas · Current choice: accepted';
        if (choice === 'essential') return 'Elección actual: solo esenciales · Current choice: essential only';
        return '';
    }

    function buildBanner() {
        var el = document.createElement('div');
        el.className = 'cookie-banner';
        el.setAttribute('role', 'region');
        el.setAttribute('aria-label', 'Aviso de cookies / Cookie notice');
        el.innerHTML =
            '<div class="cookie-banner-seal" aria-hidden="true">饼</div>' +
            '<div class="cookie-banner-body">' +
                '<p class="cookie-banner-title"><span>Cookies</span><a href="/privacy" class="cookie-banner-link">Privacidad / Privacy</a></p>' +
                '<p lang="es">Solo usamos almacenamiento esencial (sesión y reservaciones). ' +
                    'Si aceptas, también cargamos fuentes decorativas de Google Fonts.</p>' +
                '<p lang="en" class="cookie-banner-en">Essential storage only (sign-in and reservations). ' +
                    'Accepting also loads decorative Google Fonts.</p>' +
                '<p class="cookie-banner-status" aria-live="polite"></p>' +
                '<div class="cookie-banner-actions">' +
                    '<button type="button" class="cookie-btn cookie-btn-accept" data-cookie-choice="all">Aceptar / Accept</button>' +
                    '<button type="button" class="cookie-btn cookie-btn-reject" data-cookie-choice="essential" ' +
                        'title="Solo esenciales / Essential only">Rechazar / Reject</button>' +
                '</div>' +
            '</div>' +
            '<button type="button" class="cookie-banner-close" aria-label="Cerrar / Close">&times;</button>';

        el.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-cookie-choice]');
            if (btn) {
                var choice = btn.getAttribute('data-cookie-choice');
                saveChoice(choice);
                if (choice === 'all') loadOptional(); else unloadOptional();
                hideBanner();
                return;
            }
            if (e.target.closest('.cookie-banner-close')) {
                hideBanner();
                return;
            }
            var link = e.target.closest('.cookie-banner-link');
            if (link) {
                // Go to the cookies section of /privacy without putting a #hash in the address bar
                var section = document.getElementById('cookies');
                if (section && location.pathname.replace(/\.html$/, '') === '/privacy') {
                    e.preventDefault();
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                    try { sessionStorage.setItem('barPrivacyAnchor', 'cookies'); } catch (err) {}
                }
            }
        });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && readChoice()) hideBanner();
        });
        document.body.appendChild(el);
        return el;
    }

    function showBanner(focus) {
        if (!document.body) return;
        if (!banner) banner = buildBanner();
        var choice = readChoice();
        banner.querySelector('.cookie-banner-status').textContent = statusText(choice);
        banner.classList.toggle('has-choice', !!choice);
        banner.hidden = false;
        document.documentElement.classList.add('cookie-banner-open');
        if (focus) {
            var first = banner.querySelector('.cookie-btn');
            if (first) first.focus();
        }
    }

    function hideBanner() {
        if (banner) banner.hidden = true;
        document.documentElement.classList.remove('cookie-banner-open');
    }

    function init() {
        document.addEventListener('click', function (e) {
            var opener = e.target.closest && e.target.closest('[data-cookie-settings]');
            if (!opener) return;
            e.preventDefault();
            showBanner(true);
        });
        if (!readChoice()) showBanner(false);
    }

    window.barCookieConsent = {
        get: readChoice,
        open: function () { showBanner(true); }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
