/*
 * /verificar: staff check-in at the door (Spanish, noindex).
 * Scan the guest's QR with the phone camera (vendor/qr-scanner, MIT; it uses the browser's native
 * BarcodeDetector when there is one), or type the code / short code (BC-XXXXX) / 6-digit order number.
 * A USB "keyboard wedge" scanner types into the field and presses Enter, which verifies right away.
 * Valid = the reservation is checked in once (checkedIn + checkedInAt on the code and the reservation).
 * The Firestore rules decide who is staff (isAdmin); this page only mirrors that for the screens.
 */
(function () {
    'use strict';
    var ADMIN_EMAIL = 'fuchendeonze@gmail.com';
    var C = window.barCheckin;
    var $ = function (id) { return document.getElementById(id); };
    var staffUser = null;
    var busy = false;
    var scanner = null;
    var lastScan = { value: '', at: 0 };

    function show(id) {
        ['vfLoading', 'vfSignedOut', 'vfDenied', 'vfApp'].forEach(function (k) { $(k).hidden = (k !== id); });
    }

    function isStaff(user) {
        if (!user) return Promise.resolve(false);
        if (String(user.email || '').toLowerCase() === ADMIN_EMAIL && user.emailVerified) return Promise.resolve(true);
        if (!firestoreDb) return Promise.resolve(false);
        return firestoreDb.collection('barAdmins').doc(user.uid).get().then(function (s) { return s.exists; }, function () { return false; });
    }

    // "bc-k7q2m-…" / scanner quirks (other keyboard layouts turn "-" into ' or /) -> BC-K7Q2M-…
    function parseInput(raw) {
        var t = String(raw || '').toUpperCase().trim().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        var m = t.match(/BC-[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{16}/);
        if (m) return { kind: 'code', value: m[0] };
        m = t.match(/^BC-?([2-9A-HJKMNP-Z]{5})$/);
        if (m) return { kind: 'short', value: m[1] };
        if (/^[0-9]{6}$/.test(t)) return { kind: 'order', value: t };
        return null;
    }

    function withReservation(ckSnap) {
        var ck = ckSnap.data();
        var resRef = firestoreDb.collection('barReservations').doc(String(ck.orderNumber));
        return resRef.get().then(function (rs) {
            return { ck: ck, ckRef: ckSnap.ref, res: rs.exists ? rs.data() : null, resRef: resRef };
        });
    }

    function lookup(p) {
        var db = firestoreDb;
        if (p.kind === 'code') {
            return db.collection('barCheckins').doc(p.value).get().then(function (s) {
                return s.exists ? withReservation(s) : { none: true };
            });
        }
        if (p.kind === 'short') {
            return db.collection('barCheckins').where('short', '==', p.value).limit(5).get().then(function (q) {
                if (q.empty) return { none: true };
                var docs = q.docs;
                if (docs.length > 1) {
                    var tonight = docs.filter(function (d) { return d.data().date === C.serviceDate(); });
                    if (tonight.length !== 1) return { ambiguous: true };
                    docs = tonight;
                }
                return withReservation(docs[0]);
            });
        }
        // 6-digit order number (also works for reservations booked before QR codes existed)
        var resRef = db.collection('barReservations').doc(p.value);
        return resRef.get().then(function (rs) {
            if (!rs.exists) return { none: true };
            var res = rs.data();
            if (!res.checkinCode) return { res: res, resRef: resRef, legacy: true };
            var ckRef = db.collection('barCheckins').doc(res.checkinCode);
            return ckRef.get().then(function (cs) {
                return cs.exists ? { ck: cs.data(), ckRef: ckRef, res: res, resRef: resRef } : { res: res, resRef: resRef, legacy: true };
            });
        });
    }

    function detailsOf(x) {
        var r = x.res || {};
        var ck = x.ck || {};
        var d = [];
        if (r.name) d.push(['Nombre', r.name]);
        var table = r.table || ck.table;
        if (table) d.push(['Mesa', C.tableLabel(table)]);
        var date = r.date || ck.date;
        if (date) d.push(['Fecha', C.formatDateEs(date)]);
        var time = r.time || ck.time;
        if (time) d.push(['Hora', time]);
        var guests = r.guests || ck.guests;
        if (guests) d.push(['Personas', String(guests)]);
        var order = r.orderNumber || ck.orderNumber;
        if (order) d.push(['Orden', String(order) + (ck.code ? ' · ' + C.shortCode(ck.code) : ' · sin QR')]);
        return d;
    }

    function usedReason(at) {
        var t = C.formatTimeEs(at);
        return t ? 'Ya usada a las ' + t : 'Ya usada';
    }

    // Everything that makes a code NO VÁLIDA, in order; null = OK to check in
    function problemOf(x) {
        if (x.none) return { reason: 'No existe', note: 'Este código no corresponde a ninguna reservación.' };
        if (x.ambiguous) return { reason: 'Código repetido', note: 'Varios códigos empiezan así: escanea el QR completo o usa el número de orden.' };
        var ck = x.ck || null;
        var r = x.res || null;
        if ((ck && ck.checkedIn) || (r && r.checkedIn)) {
            var at = (ck && ck.checkedInAt) || (r && r.checkedInAt);
            var usedDate = at && typeof at.toDate === 'function' ? at.toDate() : null;
            return { reason: usedReason(at), note: usedDate ? 'Registrada el ' + usedDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', timeZone: 'America/Tijuana' }) + '. Cada código sirve una sola vez.' : 'Cada código sirve una sola vez.' };
        }
        if ((ck && ck.status === 'cancelled') || !r || r.status !== 'active') return { reason: 'Cancelada', note: 'Esta reservación fue cancelada.' };
        var date = r.date || (ck && ck.date);
        if ((ck && ck.status === 'expired') || date !== C.serviceDate()) {
            return { reason: 'Fecha incorrecta', note: 'La reservación es para el ' + C.formatDateEs(date) + ', no para esta noche.' };
        }
        return null;
    }

    function checkIn(x) {
        var db = firestoreDb;
        return db.runTransaction(function (t) {
            var gets = [t.get(x.resRef)];
            if (x.ckRef) gets.push(t.get(x.ckRef));
            return Promise.all(gets).then(function (snaps) {
                var rs = snaps[0], cs = snaps[1];
                if (!rs.exists) { var e1 = new Error('gone'); e1.code = 'bar/gone'; throw e1; }
                var r = rs.data(), ck = cs && cs.exists ? cs.data() : null;
                if (r.checkedIn || (ck && ck.checkedIn)) {
                    var e2 = new Error('used'); e2.code = 'bar/used'; e2.at = (ck && ck.checkedInAt) || r.checkedInAt; throw e2;
                }
                var f = { checkedIn: true, checkedInAt: firebase.firestore.FieldValue.serverTimestamp(), checkedInBy: staffUser.uid };
                if (ck) t.update(x.ckRef, f);
                t.update(x.resRef, f);
                return r;
            });
        });
    }

    function showResult(ok, reason, note, details) {
        var box = $('vfResult');
        box.classList.toggle('is-valid', ok);
        box.classList.toggle('is-invalid', !ok);
        box.querySelector('.verify-result-icon').textContent = ok ? '✓' : '✕';
        $('vfResultTitle').textContent = ok ? 'VÁLIDA' : 'NO VÁLIDA';
        $('vfResultReason').textContent = ok ? 'Bienvenido(a). Check-in registrado.' : reason;
        $('vfResultNote').textContent = ok ? '' : (note || '');
        var dl = $('vfResultDetails');
        dl.innerHTML = '';
        (details || []).forEach(function (pair) {
            var dt = document.createElement('dt'); dt.textContent = pair[0];
            var dd = document.createElement('dd'); dd.textContent = pair[1];
            dl.appendChild(dt); dl.appendChild(dd);
        });
        box.hidden = false;
        document.body.classList.add('verify-result-open');
        try { if (navigator.vibrate) navigator.vibrate(ok ? 120 : [80, 60, 80, 60, 80]); } catch (e) {}
        $('vfNext').focus();
    }

    function hideResult(keepFocus) {
        $('vfResult').hidden = true;
        document.body.classList.remove('verify-result-open');
        if (!keepFocus) $('vfInput').focus();
    }

    function verify(raw) {
        if (busy || !staffUser) return;
        var p = parseInput(raw);
        $('vfInput').value = '';
        if (!p) {
            showResult(false, 'No existe', 'Eso no parece un código de Bar Chinesca (BC-XXXXX…) ni un número de orden de 6 dígitos.', []);
            return;
        }
        busy = true;
        $('vfBusy').hidden = false;
        var found = null;
        lookup(p).then(function (x) {
            found = x;
            var problem = problemOf(x);
            if (problem) return showResult(false, problem.reason, problem.note, x.none || x.ambiguous ? [] : detailsOf(x));
            return checkIn(x).then(function () {
                showResult(true, '', '', detailsOf(x));
            });
        }).catch(function (err) {
            var code = err && err.code;
            if (code === 'bar/used') return showResult(false, usedReason(err.at), 'Cada código sirve una sola vez.', found ? detailsOf(found) : []);
            if (code === 'bar/gone') return showResult(false, 'Cancelada', 'Esta reservación fue cancelada.', found ? detailsOf(found) : []);
            console.warn('Verificación fallida:', err);
            if (code === 'permission-denied') return showResult(false, 'Sin permiso', 'La base de datos no permitió la verificación con esta cuenta.', []);
            showResult(false, 'Error', 'No se pudo verificar (¿sin conexión?). Vuelve a intentarlo.', []);
        }).then(function () {
            busy = false;
            $('vfBusy').hidden = true;
        });
    }

    // ---------------- camera ----------------
    function cameraMsg(text) {
        var m = $('vfCameraMsg');
        m.textContent = text || '';
        m.hidden = !text;
    }

    function onScan(result) {
        var value = result && typeof result === 'object' ? result.data : result;
        if (!value || busy || !$('vfResult').hidden) return;
        var now = Date.now();
        if (value === lastScan.value && now - lastScan.at < 4000) return; // same code still in front of the camera
        lastScan = { value: value, at: now };
        verify(value);
    }

    function stopCamera() {
        if (scanner) scanner.stop();
        $('vfVideo').hidden = true;
        $('vfCameraBtn').textContent = '📷 Escanear con la cámara';
        $('vfCameraBtn').setAttribute('aria-pressed', 'false');
    }

    function startCamera() {
        if (typeof QrScanner === 'undefined') { cameraMsg('No se pudo cargar el lector de QR. Usa el campo de texto o un lector USB.'); return; }
        cameraMsg('');
        QrScanner.hasCamera().then(function (has) {
            if (!has) { cameraMsg('No hay cámara disponible en este dispositivo. Usa el campo de texto o un lector USB.'); return; }
            if (!scanner) {
                scanner = new QrScanner($('vfVideo'), onScan, {
                    preferredCamera: 'environment',
                    returnDetailedScanResult: true,
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                    maxScansPerSecond: 8
                });
            }
            $('vfVideo').hidden = false;
            return scanner.start().then(function () {
                $('vfCameraBtn').textContent = '⏹ Detener cámara';
                $('vfCameraBtn').setAttribute('aria-pressed', 'true');
            });
        }).catch(function (err) {
            console.warn('Cámara no disponible:', err);
            $('vfVideo').hidden = true;
            cameraMsg('No se pudo abrir la cámara. Permite el acceso a la cámara en el navegador, o usa el campo de texto.');
        });
    }

    // ---------------- page setup ----------------
    $('vfLoginLink').addEventListener('click', function () {
        try { sessionStorage.setItem('barAfterLogin', '/verificar'); } catch (e) {}
    });
    $('vfForm').addEventListener('submit', function (e) {
        e.preventDefault();
        verify($('vfInput').value);
    });
    $('vfNext').addEventListener('click', function () { hideResult(false); });
    $('vfCameraBtn').addEventListener('click', function () {
        if ($('vfCameraBtn').getAttribute('aria-pressed') === 'true') stopCamera(); else startCamera();
    });
    // USB scanner while a result is showing: the first typed character closes it and goes to the field
    document.addEventListener('keydown', function (e) {
        if ($('vfResult').hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); hideResult(false); return; }
        if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ') {
            e.preventDefault();
            hideResult(false);
            $('vfInput').value = e.key;
        }
    });

    var ready = (typeof whenAuthReady === 'function') ? whenAuthReady() : Promise.resolve(null);
    ready.then(function (user) {
        if (!user || !firestoreDb) { show('vfSignedOut'); return; }
        return isStaff(user).then(function (ok) {
            if (!ok) {
                $('vfDeniedEmail').textContent = user.email || '';
                show('vfDenied');
                return;
            }
            staffUser = user;
            $('vfStaffEmail').textContent = user.email || '';
            $('vfServiceDate').textContent = C.formatDateEs(C.serviceDate());
            show('vfApp');
            $('vfInput').focus();
        });
    }).catch(function (err) {
        console.warn('No se pudo comprobar la sesión:', err);
        show('vfSignedOut');
    });

    window.barVerify = { verify: verify, parseInput: parseInput };
})();
