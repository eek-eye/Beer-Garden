/*
 * QR check-in codes for reservations (Bar Chinesca Mxli)
 *
 *   barReservations/{orderNumber}.checkinCode = "BC-XXXXX-YYYYYYYYYYYYYYYY"
 *   barCheckins/{code}  { code, short, orderNumber, uid, date, time, guests, table, deadlineAt,
 *                         status: active|cancelled|expired|noshow, checkedIn, checkedInAt, checkedInBy }
 *
 * Arrival window: from 00:00 (Mexicali) of the reservation day until 2 hours after the reserved
 * time (window.barArrival in script.js, same calculation as the Firestore rules). The profile and
 * the booking confirmation show a countdown to that deadline ("Tiempo para llegar").
 *
 * The code is random (5 + 16 characters from a 31-letter alphabet, ~100 bits): it can't be
 * guessed from the order number. The owner attaches it right after booking (or later, the first
 * time the profile page shows an upcoming reservation without one). Only staff (Firestore rules:
 * isAdmin) can read other people's codes and check a guest in, once.
 * QR images are drawn in the browser with vendor/qrcode.js (qrcode-generator, MIT).
 */
(function () {
    'use strict';
    var ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // no 0/O/1/I/L
    var CODE_RE = /^BC-[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{16}$/;
    var TZ = 'America/Tijuana'; // Mexicali

    function randomChars(n) {
        var out = '';
        var buf = new Uint8Array(1);
        while (out.length < n) {
            window.crypto.getRandomValues(buf);
            if (buf[0] < 248) out += ALPHABET.charAt(buf[0] % 31); // 248 = 8 * 31: no modulo bias
        }
        return out;
    }

    function newCheckinCode() {
        return 'BC-' + randomChars(5) + '-' + randomChars(16);
    }

    function shortCode(code) {
        return code ? String(code).slice(0, 8) : '';
    }

    // YYYY-MM-DD in Mexicali at `ms` (default: now)
    function mexicaliDate(ms) {
        var d = new Date(ms == null ? Date.now() : ms);
        try {
            return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
        } catch (e) {
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        }
    }

    function arrival() {
        return window.barArrival || null;
    }

    // Deadline (ms) of a reservation / code: reserved time + 2 h, Mexicali
    function deadlineOf(res) {
        var a = arrival();
        return a ? a.resDeadlineMs(res) : NaN;
    }

    function isNoShow(res) {
        var a = arrival();
        return !!(a && a.isNoShow(res));
    }

    // "10:00 p.m." / "1:00 a.m." (Mexicali time)
    function formatClockEs(ms) {
        var h, m;
        try {
            var parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms));
            parts.forEach(function (p) { if (p.type === 'hour') h = +p.value; if (p.type === 'minute') m = p.value; });
        } catch (e) {
            var d = new Date(ms); h = d.getHours(); m = String(d.getMinutes()).padStart(2, '0');
        }
        h = h % 24;
        return (h % 12 === 0 ? 12 : h % 12) + ':' + m + ' ' + (h < 12 ? 'a.m.' : 'p.m.');
    }

    // "a las 10:00 p.m." / "a la 1:00 a.m."
    function atClockEs(ms) {
        var c = formatClockEs(ms);
        return (/^1:/.test(c) ? 'a la ' : 'a las ') + c;
    }

    // "3 h 12 min 05 s" (with days when it's more than 24 h away)
    function formatCountdown(ms) {
        var total = Math.max(0, Math.floor(ms / 1000));
        var d = Math.floor(total / 86400), h = Math.floor(total % 86400 / 3600);
        var min = Math.floor(total % 3600 / 60), sec = total % 60;
        var pad = function (n) { return String(n).padStart(2, '0'); };
        var out = pad(min) + ' min ' + pad(sec) + ' s';
        if (d > 0) return d + (d === 1 ? ' día ' : ' días ') + h + ' h ' + out;
        if (h > 0) return h + ' h ' + out;
        return out;
    }

    // "Tu mesa se libera a las 10:00 p.m. si no llegas." (+ the day when it isn't today)
    function releaseNote(deadline) {
        var day = mexicaliDate(deadline);
        var when = atClockEs(deadline);
        if (day !== mexicaliDate()) {
            var p = day.split('-');
            var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
            try { when += ' del ' + d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).replace(',', ''); } catch (e) { when += ' del ' + day; }
        }
        return 'Tu mesa se libera ' + when + ' si no llegas.';
    }

    // ---- countdown: one ticker for every .arrival-timer[data-deadline] on the page ----
    var ticker = null;
    function tickTimers() {
        var now = Date.now();
        var timers = document.querySelectorAll('.arrival-timer[data-deadline]:not(.is-expired):not(.is-stopped)');
        Array.prototype.forEach.call(timers, function (el) {
            var left = +el.getAttribute('data-deadline') - now;
            var value = el.querySelector('.arrival-timer-value');
            if (left > 0) {
                if (value) value.textContent = formatCountdown(left);
                return;
            }
            el.classList.add('is-expired');
            el.querySelector('.arrival-timer-label').textContent = 'Vencida';
            el.querySelector('.arrival-timer-note').textContent = 'Pasaron 2 horas de la hora reservada: la mesa se liberó.';
            el.dispatchEvent(new CustomEvent('bar:deadline', { bubbles: true }));
        });
        if (!timers.length && ticker) { clearInterval(ticker); ticker = null; }
    }
    function startTicker() {
        if (!ticker) ticker = setInterval(tickTimers, 1000);
        tickTimers();
    }

    // HTML of a countdown for a reservation (call startTimers() after inserting it)
    function timerHtml(res) {
        var deadline = deadlineOf(res);
        if (!isFinite(deadline)) return '';
        return '<div class="arrival-timer" data-deadline="' + deadline + '" role="timer" aria-live="off">' +
            '<p class="arrival-timer-label">Tiempo para llegar: <span class="arrival-timer-value">' + formatCountdown(deadline - Date.now()) + '</span></p>' +
            '<p class="arrival-timer-note">' + releaseNote(deadline) + '</p>' +
            '</div>';
    }

    function formatDateEs(date) {
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return date || '';
        var p = date.split('-');
        var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
        try {
            return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
        } catch (e) {
            return date;
        }
    }

    function tableLabel(t) {
        var n = parseInt(t, 10);
        return n <= 4 ? 'Mesa VIP ' + n : 'Mesa ' + n;
    }

    // <svg> QR of the code (Alphanumeric mode: small, easy to scan from a phone screen)
    function qrSvg(code) {
        if (typeof qrcode !== 'function' || !code) return '';
        var qr = qrcode(0, 'M');
        qr.addData(String(code), 'Alphanumeric');
        qr.make();
        return qr.createSvgTag({ cellSize: 4, margin: 3, scalable: true });
    }

    function renderQr(el, code) {
        if (!el) return;
        el.innerHTML = qrSvg(code);
        el.setAttribute('role', 'img');
        el.setAttribute('aria-label', 'Código QR de tu reservación ' + shortCode(code));
    }

    function db() {
        return (typeof firestoreDb !== 'undefined' && firestoreDb) ? firestoreDb : null;
    }

    function currentFirebaseUser() {
        return (typeof firebaseAuth !== 'undefined' && firebaseAuth && firebaseAuth.currentUser) || null;
    }

    // Returns the reservation's code, attaching a new one if it has none yet (owner only, upcoming only).
    // Resolves null when that isn't possible (signed out, past date, offline, rules not published yet).
    function ensureCheckinCode(res) {
        if (!res) return Promise.resolve(null);
        if (res.checkinCode && CODE_RE.test(res.checkinCode)) return Promise.resolve(res.checkinCode);
        var user = currentFirebaseUser();
        var store = db();
        if (!user || !store || res.uid !== user.uid || !res.orderNumber) return Promise.resolve(null);
        if (!res.date || isNoShow(res) || res.checkedIn) return Promise.resolve(null);
        var code = newCheckinCode();
        var deadline = deadlineOf(res);
        var resRef = store.collection('barReservations').doc(String(res.orderNumber));
        var batch = store.batch();
        batch.update(resRef, { checkinCode: code });
        batch.set(store.collection('barCheckins').doc(code), {
            code: code,
            short: code.slice(3, 8),
            orderNumber: String(res.orderNumber),
            uid: user.uid,
            date: res.date,
            time: res.time,
            guests: res.guests,
            table: parseInt(res.table, 10),
            status: 'active',
            checkedIn: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            deadlineAt: firebase.firestore.Timestamp.fromMillis(deadline)
        });
        return batch.commit().then(function () {
            res.checkinCode = code;
            return code;
        }, function (err) {
            // Another tab may have attached one already: use that one
            return resRef.get().then(function (snap) {
                var existing = snap.exists && snap.data().checkinCode;
                if (existing) { res.checkinCode = existing; return existing; }
                console.warn('Código QR no disponible todavía:', err && err.code);
                return null;
            }, function () {
                console.warn('Código QR no disponible todavía:', err && err.code);
                return null;
            });
        });
    }

    // ---- booking confirmation on the site: dialog with the QR (or the "sin QR" note) ----
    function showBookingQr(res, codePromise) {
        var dlg = document.getElementById('checkinDialog');
        if (!dlg) {
            dlg = document.createElement('dialog');
            dlg.id = 'checkinDialog';
            dlg.className = 'checkin-dialog';
            dlg.setAttribute('aria-labelledby', 'checkinDialogTitle');
            dlg.innerHTML =
                '<h2 id="checkinDialogTitle" class="checkin-dialog-title">Tu código de entrada</h2>' +
                '<p class="checkin-dialog-sub">Muéstralo en la puerta: lo escaneamos y listo.</p>' +
                '<div class="checkin-qr checkin-qr-large"><p class="checkin-qr-loading">Generando tu código QR…</p></div>' +
                '<p class="checkin-code"></p>' +
                '<p class="checkin-dialog-details"></p>' +
                '<div class="checkin-dialog-timer"></div>' +
                '<p class="checkin-dialog-hint">También lo encuentras en <a href="/profile">tu perfil</a>.</p>' +
                '<button type="button" class="btn btn-primary checkin-dialog-close">Listo</button>';
            document.body.appendChild(dlg);
            dlg.querySelector('.checkin-dialog-close').addEventListener('click', function () { dlg.close(); });
            dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
        }
        var qrEl = dlg.querySelector('.checkin-qr');
        var codeEl = dlg.querySelector('.checkin-code');
        qrEl.className = 'checkin-qr checkin-qr-large';
        qrEl.innerHTML = '<p class="checkin-qr-loading">Generando tu código QR…</p>';
        codeEl.textContent = '';
        dlg.querySelector('.checkin-dialog-details').textContent =
            'Orden ' + res.orderNumber + ' · ' + tableLabel(res.table) + ' · ' + formatDateEs(res.date) + ' · ' + res.time + ' · ' +
            res.guests + (String(res.guests) === '1' ? ' persona' : ' personas');
        dlg.querySelector('.checkin-dialog-timer').innerHTML = timerHtml(res);
        startTicker();
        if (!dlg.open) {
            if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
        }
        return Promise.resolve(codePromise).then(function (code) {
            if (code) {
                renderQr(qrEl, code);
                codeEl.textContent = shortCode(code);
            } else {
                qrEl.className = 'checkin-qr checkin-qr-large checkin-qr-none';
                qrEl.removeAttribute('role');
                qrEl.innerHTML = '<p class="checkin-noqr"><strong>Sin QR por ahora.</strong> En la entrada da tu número de orden: <strong>' +
                    String(res.orderNumber).replace(/\D/g, '') + '</strong>. Tu código aparecerá en tu perfil.</p>';
            }
            return code;
        });
    }

    window.barCheckin = {
        CODE_RE: CODE_RE,
        newCode: newCheckinCode,
        shortCode: shortCode,
        mexicaliDate: mexicaliDate,
        deadlineOf: deadlineOf,
        isNoShow: isNoShow,
        formatClockEs: formatClockEs,
        formatCountdown: formatCountdown,
        releaseNote: releaseNote,
        timerHtml: timerHtml,
        startTimers: startTicker,
        formatDateEs: formatDateEs,
        tableLabel: tableLabel,
        qrSvg: qrSvg,
        renderQr: renderQr,
        ensureCode: ensureCheckinCode,
        showBookingQr: showBookingQr
    };
})();
