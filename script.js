// Fixed header height (section links land just below it)
function navScrollOffset() {
    // scrolled header (70px) + the tiled roof on top of it (--roof-h in styles.css)
    const roof = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--roof-h')) || 0;
    return 70 + roof;
}

// Store reservations by date
let reservations = JSON.parse(localStorage.getItem('reservations')) || {};
// Store order details with order numbers
let orderDetails = JSON.parse(localStorage.getItem('orderDetails')) || {};
// Store user accounts
let userAccounts = JSON.parse(localStorage.getItem('userAccounts')) || {};
// Current logged in user
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Debug function to check stored orders (can be called from browser console)
window.checkStoredOrders = function() {
    const stored = localStorage.getItem('orderDetails');
    console.log('Raw localStorage data:', stored);
    const parsed = stored ? JSON.parse(stored) : {};
    console.log('Parsed order details:', parsed);
    console.log('Number of orders:', Object.keys(parsed).length);
    console.log('Order numbers:', Object.keys(parsed));
    return parsed;
};

// Function to create test order for testing cancellation
window.createTestOrder = function() {
    // Generate a random 6-digit order number
    const testOrderNumber = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Use today's date or a future date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const testDate = `${year}-${month}-${day}`;
    const testTable = Math.floor(Math.random() * 50) + 1; // Random table 1-50
    
    // Reload current data
    orderDetails = JSON.parse(localStorage.getItem('orderDetails')) || {};
    reservations = JSON.parse(localStorage.getItem('reservations')) || {};
    
    // Ensure order number is stored as string
    const orderKey = testOrderNumber.toString();
    
    // Create test order details - always use string key
    orderDetails[orderKey] = {
        name: 'Test Customer',
        email: 'test@example.com',
        date: testDate,
        time: '20:00',
        guests: '4',
        table: testTable
    };
    
    // Save to localStorage
    localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
    
    // Create reservation entry
    if (!reservations[testDate]) {
        reservations[testDate] = {};
    }
    reservations[testDate][testTable.toString()] = orderKey;
    localStorage.setItem('reservations', JSON.stringify(reservations));
    
    console.log('✅ Test order created!');
    console.log('Order Number (key):', orderKey, 'Type:', typeof orderKey);
    console.log('Table:', testTable <= 11 ? `VIP Table ${testTable}` : `Table ${testTable}`);
    console.log('Date:', testDate);
    console.log('Order details:', orderDetails[orderKey]);
    console.log('\nYou can now use order number', orderKey, 'to test the cancellation flow.');
    
    alert('¡Orden de prueba creada!\n\nNúmero de orden: ' + orderKey + '\nMesa: ' + (testTable <= 11 ? 'Mesa VIP ' : 'Mesa ') + testTable + '\nFecha: ' + testDate + '\n\nYa puedes cancelar esta reservación con el número de orden.');
    
    return orderKey;
};

// Generate unique 6-digit order number
function generateOrderNumber() {
    // Reload orderDetails to check for existing order numbers
    orderDetails = JSON.parse(localStorage.getItem('orderDetails')) || {};
    
    let orderNumber;
    let attempts = 0;
    const maxAttempts = 1000;
    
    // Generate a unique 6-digit number (100000 to 999999)
    do {
        orderNumber = Math.floor(100000 + Math.random() * 900000).toString();
        attempts++;
        
        // Safety check to prevent infinite loop
        if (attempts > maxAttempts) {
            console.error('Unable to generate unique order number after', maxAttempts, 'attempts');
            // Fallback: use timestamp-based number
            orderNumber = Date.now().toString().slice(-6);
            break;
        }
    } while (orderDetails[orderNumber]); // Keep generating until we find a unique one
    
    console.log('Generated unique order number:', orderNumber);
    return orderNumber;
}

// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger && navMenu) hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link (the "Social" bookmark only opens its flyout)
document.querySelectorAll('.nav-menu a:not(.nav-social-toggle)').forEach(link => {
    link.addEventListener('click', () => {
        if (!hamburger || !navMenu) return;
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// "Social" bookmark: toggles a small flyout with the Facebook / Instagram links (no navigation, no #)
(function() {
    var toggle = document.querySelector('.nav-social-toggle');
    var flyout = document.getElementById('navSocialFlyout');
    if (!toggle || !flyout) return;
    var tab = toggle.closest('li');
    function setOpen(open) {
        flyout.hidden = !open;
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (tab) tab.classList.toggle('is-open', open);
    }
    toggle.addEventListener('click', function(e) {
        e.preventDefault();
        setOpen(flyout.hidden);
    });
    flyout.addEventListener('click', function(e) {
        if (e.target.closest('a')) setTimeout(function() { setOpen(false); }, 0);
    });
    document.addEventListener('click', function(e) {
        if (!flyout.hidden && tab && !tab.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !flyout.hidden) {
            setOpen(false);
            toggle.focus();
        }
    });
})();

// Menu Tab Switching
const tabBtns = document.querySelectorAll('.tab-btn');
const menuCategories = document.querySelectorAll('.menu-category');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons and categories
        tabBtns.forEach(b => b.classList.remove('active'));
        menuCategories.forEach(cat => cat.classList.remove('active'));

        // Add active class to clicked button
        btn.classList.add('active');

        // Show corresponding menu category
        const category = btn.getAttribute('data-category');
        document.getElementById(category).classList.add('active');

        // Smooth scroll to menu section if on mobile
        if (window.innerWidth <= 768) {
            document.getElementById('menu').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ============================================
// RESERVATIONS (shared Firebase Firestore database)
//   barReservations/{orderNumber}  the user's reservation (private to its owner)
//   barTableLocks/{date_table}     "table taken on date" (public, no personal data)
//   barUserActive/{uid}            the user's tables that still count: res = {orderNumber: date}
//                                  (the security rules check the limits below on it)
// Limits per account (Mexicali dates, same "night" as the check-in codes: 00:00 until 6:00 AM next day):
//   - today: up to 2 tables; any future date: 1 table (a 2nd slot opens when that date arrives)
//   - at most 3 upcoming tables (today + future); past nights and cancelled tables don't count
// ============================================
var MAX_TABLES_TODAY = 2;
var MAX_TABLES_PER_FUTURE_DAY = 1;
var MAX_ACTIVE_TABLES = 3;
var PERMANENTLY_RESERVED_TABLES = [1, 20, 21, 22];
function isPermanentlyReservedTable(table) {
    return PERMANENTLY_RESERVED_TABLES.indexOf(parseInt(table, 10)) !== -1;
}
function permanentTableLocks() {
    var locks = {};
    PERMANENTLY_RESERVED_TABLES.forEach(function(table) {
        locks[String(table)] = { permanent: true };
    });
    return locks;
}
function includePermanentTableLocks(locks) {
    locks = locks || {};
    PERMANENTLY_RESERVED_TABLES.forEach(function(table) {
        if (!locks[String(table)]) locks[String(table)] = { permanent: true };
    });
    return locks;
}
var LIMIT_MESSAGES = {
    today: 'Ya tienes 2 mesas para hoy. Es el máximo por noche.',
    future: 'Solo puedes reservar 1 mesa por día con anticipación. El mismo día de tu reservación se abre un segundo lugar.',
    total: 'Límite de 3 mesas activas. Cancela una o espera a que pase su fecha para reservar otra.'
};
var SIGN_IN_TO_RESERVE_MESSAGE = '<a href="/login">Inicia sesión</a> para reservar una mesa. Cada cuenta puede reservar hasta 2 mesas para hoy y 1 por día con anticipación (máximo 3 activas).';
var firestoreDb = null;

function localDateString(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function barError(code, extra) {
    var err = new Error(code);
    err.code = code;
    if (extra) Object.keys(extra).forEach(function(k) { err[k] = extra[k]; });
    return err;
}

function barLockId(date, table) {
    return date + '_' + parseInt(table, 10);
}

// ---- Service night (Mexicali, America/Tijuana) ----
// A reservation's code works from 00:00 of its date (arriving early is fine) until 6:00 AM the next
// morning (booked for 10 PM, arriving at 1 AM is fine). After that the night is over: the reservation
// no longer holds a table and goes to the profile's Registros. Same calculation as the Firestore rules:
// Mexicali uses UTC-7 from the 2nd Sunday of March to the 1st Sunday of November, UTC-8 otherwise;
// the switch is at 2 AM, so midnight uses the previous day's offset and 6 AM the next day's.
function barMxOffsetHours(date) {
    var y = +date.slice(0, 4), m = +date.slice(5, 7), d = +date.slice(8, 10);
    function isoDow(mm, dd) { var w = new Date(Date.UTC(y, mm - 1, dd)).getUTCDay(); return w === 0 ? 7 : w; }
    var secondSundayMarch = 8 + (7 - isoDow(3, 1)) % 7;
    var firstSundayNovember = 1 + (7 - isoDow(11, 1)) % 7;
    return ((m > 3 && m < 11) || (m === 3 && d >= secondSundayMarch) || (m === 11 && d < firstSundayNovember)) ? 7 : 8;
}
function barAddDays(date, n) {
    return new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10) + n)).toISOString().slice(0, 10);
}
// 00:00 Mexicali on the reservation date
function barDayStartMs(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return NaN;
    return Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), barMxOffsetHours(barAddDays(date, -1)), 0);
}
// 6:00 AM Mexicali the morning after the reservation date
function barNightEndMs(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return NaN;
    var next = barAddDays(date, 1);
    return Date.UTC(+next.slice(0, 4), +next.slice(5, 7) - 1, +next.slice(8, 10), barMxOffsetHours(next) + 6, 0);
}
// The reservation's night is over (after 6:00 AM Mexicali the next morning)
function barIsPastNight(r, now) {
    var end = barNightEndMs(r && r.date);
    return isFinite(end) && (now || Date.now()) > end;
}
// The date's night has started (00:00 Mexicali): it counts as "today" (2 tables) until 6:00 AM next morning
function barNightStarted(date, now) {
    var start = barDayStartMs(date);
    return isFinite(start) && (now || Date.now()) >= start;
}
// Which limit stops a new table for `date` (null = allowed). active = the user's reservations whose
// night isn't over. Same rules as firestore.rules (the database refuses anything beyond them).
function barLimitFor(active, date, now) {
    var list = (active || []).filter(function(r) { return !barIsPastNight(r, now); });
    if (date) {
        var today = barNightStarted(date, now);
        var sameDay = list.filter(function(r) { return r.date === date; }).length;
        if (sameDay >= (today ? MAX_TABLES_TODAY : MAX_TABLES_PER_FUTURE_DAY)) return today ? 'today' : 'future';
    }
    if (list.length >= MAX_ACTIVE_TABLES) return 'total';
    return null;
}
window.barLimits = { limitFor: barLimitFor, nightStarted: barNightStarted, messages: LIMIT_MESSAGES };
window.barArrival = {
    offsetHours: barMxOffsetHours,
    dayStartMs: barDayStartMs,
    nightEndMs: barNightEndMs,
    isPastNight: barIsPastNight
};

// Resolves with the Firebase user (or null) once Firebase has restored the session
var authReadyResolve;
var authReadyPromise = new Promise(function(resolve) { authReadyResolve = resolve; });
function whenAuthReady() {
    if (!firebaseAuth) return Promise.resolve(null);
    return authReadyPromise.then(function() { return firebaseAuth.currentUser; });
}
window.whenAuthReady = whenAuthReady;

// The signed-in user's reservations (all dates), newest data from Firestore
function getMyReservations(uid) {
    if (!firestoreDb || !uid) return Promise.resolve([]);
    return firestoreDb.collection('barReservations').where('uid', '==', uid).get().then(function(snap) {
        var list = [];
        snap.forEach(function(d) { list.push(d.data()); });
        return list;
    });
}
window.getMyReservations = getMyReservations;

// Look up one reservation by order number (only works for its owner)
function getBarReservation(orderNumber) {
    return whenAuthReady().then(function(user) {
        if (!user || !firestoreDb) throw barError('bar/signed-out');
        return firestoreDb.collection('barReservations').doc(String(orderNumber)).get().then(function(snap) {
            if (!snap.exists) return null;
            return snap.data();
        }, function(err) {
            if (err && err.code === 'permission-denied') return null; // someone else's order
            throw err;
        });
    });
}
window.getBarReservation = getBarReservation;

// Cancel = delete the reservation + its table lock and take it out of the user's active index, all at once.
// Its QR check-in code (if any) is closed in the same transaction: "cancelled", or "expired" for the
// past-night cleanup. A code that was already checked in stays "used" (checkedIn) either way.
function cancelBarReservation(orderNumber, closeAs) {
    return whenAuthReady().then(function(user) {
        if (!user || !firestoreDb) throw barError('bar/signed-out');
        var resRef = firestoreDb.collection('barReservations').doc(String(orderNumber));
        var activeRef = firestoreDb.collection('barUserActive').doc(user.uid);
        return firestoreDb.runTransaction(function(t) {
            return t.get(resRef).then(function(resSnap) {
                if (!resSnap.exists) throw barError('bar/not-found');
                var res = resSnap.data();
                if (res.uid !== user.uid) throw barError('bar/not-found');
                var lockRef = firestoreDb.collection('barTableLocks').doc(barLockId(res.date, res.table));
                return Promise.all([t.get(activeRef), t.get(lockRef)]).then(function(snaps) {
                    return { res: res, activeSnap: snaps[0], lockSnap: snaps[1], lockRef: lockRef };
                });
            }).then(function(x) {
                var res = x.res;
                var active = x.activeSnap.exists ? Object.assign({}, x.activeSnap.data().res || {}) : null;
                if (res.checkinCode) {
                    t.update(firestoreDb.collection('barCheckins').doc(res.checkinCode), {
                        status: closeAs === 'expired' ? 'expired' : 'cancelled',
                        closedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                t.delete(resRef);
                // only remove the lock if it is this reservation's own
                if (x.lockSnap.exists && String(x.lockSnap.data().orderNumber) === String(orderNumber)) t.delete(x.lockRef);
                // reservations made before the index existed aren't in it: nothing to remove then
                if (active && Object.prototype.hasOwnProperty.call(active, String(orderNumber))) {
                    delete active[String(orderNumber)];
                    t.set(activeRef, {
                        res: active,
                        lastOrder: String(orderNumber),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                return res;
            });
        }).then(function(res) {
            invalidateTableLocks(res.date);
            return res;
        });
    });
}
window.cancelBarReservation = cancelBarReservation;

// Reservations whose night is over (after 6:00 AM Mexicali the next morning) no longer hold a table
// and don't count against the limits. Cancel the user's own ones (frees their slot in the active index;
// the code is closed as "expired" so it stays in the profile's Registros: verified or "No verificada").
function barHoldsNoTable(r) {
    return barIsPastNight(r);
}
function cancelPastReservations(uid) {
    return getMyReservations(uid).then(function(list) {
        var past = list.filter(function(r) { return barHoldsNoTable(r); });
        return past.reduce(function(p, r) {
            return p.then(function() {
                return cancelBarReservation(r.orderNumber, 'expired').catch(function(err) {
                    console.warn('Could not clear past reservation', r.orderNumber, err && err.code);
                });
            });
        }, Promise.resolve()).then(function() {
            var active = list.filter(function(r) { return !barHoldsNoTable(r); });
            return pruneActiveIndex(uid, active).then(function() { return active; });
        });
    });
}

// Index entries that no longer match a table (past night, or reservation gone) are removed one by one
// (the rules allow that alone), so they never block a new booking
function pruneActiveIndex(uid, active) {
    var activeRef = firestoreDb.collection('barUserActive').doc(uid);
    var keep = {};
    active.forEach(function(r) { keep[String(r.orderNumber)] = true; });
    return activeRef.get().then(function(snap) {
        if (!snap.exists) return;
        var stale = Object.keys(snap.data().res || {}).filter(function(o) { return !keep[o]; });
        return stale.reduce(function(p, o) {
            return p.then(function() {
                return firestoreDb.runTransaction(function(t) {
                    return t.get(activeRef).then(function(s) {
                        var m = Object.assign({}, (s.exists && s.data().res) || {});
                        if (!Object.prototype.hasOwnProperty.call(m, o)) return;
                        delete m[o];
                        t.set(activeRef, { res: m, lastOrder: o, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
                    });
                }).catch(function(err) { console.warn('Could not clear old index entry', o, err && err.code); });
            });
        }, Promise.resolve());
    }).catch(function(err) { console.warn('Could not read your active tables:', err && err.code); });
}

// Book one table: reservation + table lock + active-index entry in one transaction (the rules re-check all of it)
function bookTableInFirestore(user, formData) {
    var table = parseInt(formData.table, 10);
    if (isPermanentlyReservedTable(table)) return Promise.reject(barError('bar/table-unavailable'));
    var lockRef = firestoreDb.collection('barTableLocks').doc(barLockId(formData.date, table));
    var activeRef = firestoreDb.collection('barUserActive').doc(user.uid);
    var attempts = 0;
    var validUntil = firebase.firestore.Timestamp.fromMillis(barNightEndMs(formData.date));
    function attempt() {
        attempts++;
        var orderNumber = String(Math.floor(100000 + Math.random() * 900000));
        var resRef = firestoreDb.collection('barReservations').doc(orderNumber);
        return firestoreDb.runTransaction(function(t) {
            return Promise.all([t.get(lockRef), t.get(activeRef), t.get(resRef)]).then(function(snaps) {
                if (snaps[0].exists) {
                    throw barError('bar/table-taken', { orderNumber: snaps[0].data().orderNumber });
                }
                var active = Object.assign({}, (snaps[1].exists && snaps[1].data().res) || {});
                var entries = Object.keys(active).map(function(o) { return { orderNumber: o, date: active[o] }; });
                var limit = barLimitFor(entries, formData.date);
                if (limit) throw barError('bar/limit', { limit: limit });
                if (snaps[2].exists) throw barError('bar/order-number-taken');
                active[orderNumber] = formData.date;
                var ts = firebase.firestore.FieldValue.serverTimestamp();
                t.set(resRef, {
                    orderNumber: orderNumber,
                    uid: user.uid,
                    email: formData.email,
                    name: formData.name,
                    date: formData.date,
                    time: formData.time,
                    guests: formData.guests,
                    table: table,
                    status: 'active',
                    createdAt: ts,
                    validUntil: validUntil
                });
                t.set(lockRef, { date: formData.date, table: table, time: formData.time, orderNumber: orderNumber, createdAt: ts, validUntil: validUntil });
                t.set(activeRef, { res: active, lastOrder: orderNumber, updatedAt: ts });
                return orderNumber;
            });
        }).catch(function(err) {
            // Random order number already used (by someone else it reads as permission-denied): pick another
            var retry = err && (err.code === 'bar/order-number-taken' || (err.code === 'permission-denied' && attempts < 2));
            if (retry && attempts < 5) return attempt();
            throw err;
        });
    }
    return attempt();
}

// Inline message under the reservation form's submit button (same look as the login page messages)
function showReservationMessage(html, kind) {
    var el = document.getElementById('reservationLimitMessage');
    if (!el) {
        alert(String(html).replace(/<[^>]+>/g, ''));
        return;
    }
    el.innerHTML = html;
    el.setAttribute('data-kind', kind || '');
    el.style.display = 'block';
}

function hideReservationMessage(kind) {
    var el = document.getElementById('reservationLimitMessage');
    if (!el) return;
    if (kind && el.getAttribute('data-kind') !== kind) return;
    el.style.display = 'none';
    el.innerHTML = '';
    el.setAttribute('data-kind', '');
}

// The signed-in user's reservations whose night isn't over (null = unknown / signed out)
var myActiveReservations = null;

// Limit reached for the selected date (or 3 active tables): grey, disabled send button, table signs
// switched off (dropdown disabled) and a short message. Re-evaluated on every date change and each minute
// (so a future date's 2nd slot opens by itself when that date arrives).
function applyReservationLimit() {
    var form = document.getElementById('reservationForm');
    if (!form) return;
    var dateEl = document.getElementById('date');
    var kind = myActiveReservations ? barLimitFor(myActiveReservations, dateEl ? dateEl.value : '') : null;
    var btn = form.querySelector('button[type="submit"]');
    var select = document.getElementById('table');
    var chart = document.querySelector('.seating-chart-container');
    form.classList.toggle('is-limit-reached', !!kind);
    form.setAttribute('data-limit', kind || '');
    if (btn) {
        btn.classList.toggle('is-limit-blocked', !!kind);
        btn.disabled = !!kind || reservationSubmitting;
        if (kind) btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled');
    }
    if (select) {
        select.disabled = !!kind;
        if (kind) select.value = '';
    }
    if (chart) chart.classList.toggle('tables-off', !!kind);
    if (kind) {
        document.querySelectorAll('.vip-seat.is-selected, .seat-circle.is-selected, .seat-square.is-selected').forEach(function(seat) { seat.classList.remove('is-selected'); });
        showReservationMessage(LIMIT_MESSAGES[kind], 'limit');
    } else {
        hideReservationMessage('limit');
    }
}

// Load the signed-in user's active tables, then apply the limits for the selected date
function updateReservationLimitNotice() {
    if (!document.getElementById('reservationForm')) return;
    var user = JSON.parse(localStorage.getItem('currentUser')) || null;
    var fbUser = firebaseAuth && firebaseAuth.currentUser;
    if (!user) {
        myActiveReservations = null;
        applyReservationLimit();
        return;
    }
    hideReservationMessage('signin');
    if (!fbUser || !firestoreDb) {
        myActiveReservations = null;
        applyReservationLimit();
        return;
    }
    getMyReservations(fbUser.uid).then(function(list) {
        myActiveReservations = list.filter(function(r) { return !barHoldsNoTable(r); });
        applyReservationLimit();
    }).catch(function(err) {
        console.warn('Could not check your reservations:', err && err.code);
    });
}
setInterval(function() { if (myActiveReservations) applyReservationLimit(); }, 60000);

window.addEventListener('pageshow', function(e) { if (e.persisted) updateReservationLimitNotice(); });

// Reservation Form Handler
const reservationForm = document.getElementById('reservationForm');
var reservationSubmitting = false;

if (reservationForm) {
    reservationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (reservationSubmitting) return;

        // Reservations need a real (Firebase) account so the per-account limits can be enforced
        currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        var fbUser = firebaseAuth && firebaseAuth.currentUser;
        if (!currentUser || !fbUser) {
            showReservationMessage(SIGN_IN_TO_RESERVE_MESSAGE, 'signin');
            return;
        }

        // Get form data (use logged in user's info to ensure consistency)
        const formData = {
            name: ((currentUser.firstName || '') + ' ' + (currentUser.lastName || '')).trim() || fbUser.displayName || fbUser.email,
            email: fbUser.email || currentUser.email,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            guests: document.getElementById('guests').value,
            table: document.getElementById('table').value
        };
        
        // Limit already reached for this date (the button is disabled then; this also covers Enter / scripts)
        if (myActiveReservations && barLimitFor(myActiveReservations, formData.date)) {
            applyReservationLimit();
            return;
        }

        // Check if the selected date is locked
        if (isDateLocked(formData.date)) {
            alert('Esta fecha ya no está disponible para reservar. Las reservaciones se cierran a las 7:00 p. m. de ese día.');
            return;
        }
        
        // Check if time is before 7 PM (business hours start at 7 PM)
        const selectedTime = formData.time;
        if (selectedTime) {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const timeInMinutes = hours * 60 + minutes;
            const businessStartTime = 19 * 60; // 7 PM = 19:00 = 1140 minutes
            
            if (timeInMinutes < businessStartTime) {
                alert('Abrimos a las 7:00 p. m. Elige una hora a partir de las 7:00 p. m.');
                return;
            }
        }

        if (!firestoreDb) {
            alert('Las reservaciones no están disponibles en este momento. Recarga la página y vuelve a intentarlo.');
            return;
        }

    // Format the date for display (avoid timezone issues)
    const dateParts = formData.date.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2]);
    const dateObj = new Date(year, month, day);
    const formattedDate = dateObj.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const submitBtn = reservationForm.querySelector('button[type="submit"]');
    reservationSubmitting = true;
    if (submitBtn) submitBtn.disabled = true;

    // 1) past-dated reservations of this user are cancelled first (they no longer hold a table)
    // 2) limits (2 today, 1 per future date, 3 active), 3) book table + lock + index entry in one transaction
    cancelPastReservations(fbUser.uid).then(function(active) {
        myActiveReservations = active;
        var limit = barLimitFor(active, formData.date);
        if (limit) throw barError('bar/limit', { limit: limit });
        return bookTableInFirestore(fbUser, formData);
    }).then(function(orderNumber) {
        onReservationBooked(formData, orderNumber, formattedDate);
    }).catch(function(err) {
        var code = err && err.code;
        if (code === 'bar/limit') {
            updateReservationLimitNotice();
            showReservationMessage(LIMIT_MESSAGES[err.limit] || LIMIT_MESSAGES.total, 'limit');
        } else if (code === 'bar/table-taken') {
            alert('Esta mesa ya está reservada para esa fecha (mesa ' + formData.table + ', orden ' + err.orderNumber + '). Elige otra mesa.');
            updateSeatingChartForDate(formData.date, true);
            updateTableDropdownForDate(formData.date);
        } else if (code === 'bar/table-unavailable') {
            alert('Esta mesa está reservada permanentemente. Elige otra mesa.');
            updateSeatingChartForDate(formData.date, true);
            updateTableDropdownForDate(formData.date);
        } else if (code === 'permission-denied') {
            // The database refused the booking: most likely one of the per-account limits
            getMyReservations(fbUser.uid).then(function(list) {
                myActiveReservations = list.filter(function(r) { return !barHoldsNoTable(r); });
                if (barLimitFor(myActiveReservations, formData.date)) {
                    applyReservationLimit();
                } else {
                    alert('Lo sentimos, no pudimos guardar tu reservación. Recarga la página y vuelve a intentarlo.');
                }
            }).catch(function() {
                alert('Lo sentimos, no pudimos guardar tu reservación. Recarga la página y vuelve a intentarlo.');
            });
        } else {
            console.warn('Reservation failed:', err);
            alert('Lo sentimos, no pudimos guardar tu reservación. Revisa tu conexión y vuelve a intentarlo.');
        }
    }).then(function() {
        reservationSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
        applyReservationLimit();
    });
});
}

// After the reservation is saved: same confirmation, email, seating chart update and success toast as before
function onReservationBooked(formData, orderNumber, formattedDate) {
    // Create confirmation message
    const confirmationMessage = `
¡Gracias por tu solicitud de reservación, ${formData.name}!

Datos de tu reservación:
- Número de orden: ${orderNumber}
- Fecha: ${formattedDate}
- Hora: ${formData.time}
- Personas: ${formData.guests}
- Mesa: ${formData.table}
- Correo: ${formData.email}

Guarda tu número de orden: ${orderNumber}
Lo necesitas si quieres cancelar tu reservación.

Te contactaremos en ${formData.email} para confirmar tu reservación.

💵 ¡Te ahorras del 10% al 15% en tu compra al pagar en efectivo!

También puedes reservar directamente al +52 686 364 2083.
    `.trim();

    // QR check-in code: attached right away (owner + upcoming reservation); the confirmation email is
    // sent once that is done so it can include the code (the script reads everything from the database)
    var fbUserNow = firebaseAuth && firebaseAuth.currentUser;
    var bookedRes = {
        orderNumber: String(orderNumber), uid: fbUserNow ? fbUserNow.uid : '', date: formData.date,
        time: formData.time, guests: formData.guests, table: parseInt(formData.table, 10)
    };
    var codePromise = (window.barCheckin && fbUserNow) ? window.barCheckin.ensureCode(bookedRes) : Promise.resolve(null);
    codePromise.catch(function() { return null; }).then(function() {
        sendReservationEmail('confirm', orderNumber);
    });

    // Show confirmation (in a real app, this would send to a server)
    alert(confirmationMessage);

    // Reset form
    reservationForm.reset();
    hideReservationMessage();
    checkLoginStatus(); // refill name/email and re-check the limits with the new table
    
    // Update seating chart and dropdown for the current date (if date input still has a value)
    const dateInput = document.getElementById('date');
    invalidateTableLocks(formData.date);
    if (dateInput.value) {
        updateSeatingChartForDate(dateInput.value);
        updateTableDropdownForDate(dateInput.value);
    } else {
        // Keep the permanently unavailable tables marked even without a selected date
        renderSeatingChart(permanentTableLocks());
        renderTableDropdown(permanentTableLocks());
    }

    // Show success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: #4CAF50;
        color: white;
        padding: 20px 30px;
        border-radius: 5px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-size: 1.1rem;
        text-align: center;
    `;
    successDiv.innerHTML = '✓ ¡Solicitud de reservación enviada! Te contactaremos para confirmar.<br><span style="display:inline-block;margin-top:8px;font-size:0.95rem;">💵 ¡Te ahorras del <strong>10% al 15%</strong> en tu compra al pagar en efectivo!</span>';
    document.body.appendChild(successDiv);

    // Remove success message after 5 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 5000);

    // Entry QR code for the door (or the "sin QR" note with the order number)
    if (window.barCheckin && fbUserNow) window.barCheckin.showBookingQr(bookedRes, codePromise);
}

// Initialize seat elements with data attributes for table numbers
function initializeSeatDataAttributes() {
    const allSeats = document.querySelectorAll('.vip-seat, .seat-circle, .seat-square');
    allSeats.forEach(seat => {
        const text = seat.textContent.trim();
        const seatNumber = parseInt(text);
        if (!isNaN(seatNumber)) {
            seat.dataset.tableNumber = seatNumber.toString();
            seat.setAttribute('role', 'button');
            seat.setAttribute('tabindex', '0');
            seat.setAttribute('aria-label', `${seatNumber <= 11 ? 'Mesa VIP' : 'Mesa'} ${seatNumber}`);
            seat.setAttribute('aria-pressed', 'false');
        }
    });
}

// Initialize seat data attributes on page load
initializeSeatDataAttributes();

// Set minimum date for reservation form
// Dates are locked at 1:30 AM the next day, so today is always available
const dateInput = document.getElementById('date');
const now = new Date();
const currentHour = now.getHours();
const currentMinute = now.getMinutes();

// Get today's date in local timezone (YYYY-MM-DD format)
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');
const todayStr = `${year}-${month}-${day}`;

// Set minimum to today so today is always selectable
if (dateInput) dateInput.setAttribute('min', todayStr);

// Add validation to prevent booking dates that have passed 7 PM on that day
function isDateLocked(dateString) {
    const now = new Date();
    const selectedDate = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If selected date is in the past (before today), it's locked
    if (selectedDate.getTime() < today.getTime()) {
        return true;
    }
    
    // If selected date is today, check if it's past 7 PM (19:00)
    if (selectedDate.getTime() === today.getTime()) {
        const currentHour = now.getHours();
        // If it's 7 PM (19:00) or later, today is locked
        if (currentHour >= 19) {
            return true;
        }
        // Before 7 PM, today is available
        return false;
    }
    
    // If selected date is in the future, it's available
    return false;
}

// Initialize table dropdown (will be updated when date is selected)
const tableSelect = document.getElementById('table');
for (let i = 1; i <= 50; i++) {
    if (isPermanentlyReservedTable(i)) continue;
    const option = document.createElement('option');
    option.value = i;
    if (i <= 11) {
        option.textContent = `Mesa VIP ${i}`;
    } else {
        option.textContent = `Mesa ${i}`;
    }
    if (tableSelect) tableSelect.appendChild(option);
}

// Seating chart: light up the table picked in the dropdown (visual only; booking logic is unchanged)
function highlightSelectedTable() {
    const select = document.getElementById('table');
    const value = select ? select.value : '';
    document.querySelectorAll('.vip-seat, .seat-circle, .seat-square').forEach(seat => {
        const selected = !!value && seat.dataset.tableNumber === value && !seat.classList.contains('reserved');
        seat.classList.toggle('is-selected', selected);
        seat.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
}
if (tableSelect) tableSelect.addEventListener('change', highlightSelectedTable);

// Pick an available table directly from the seating chart.
function selectTableFromChart(seat) {
    if (!tableSelect || tableSelect.disabled || seat.classList.contains('reserved')) return;
    const tableNumber = seat.dataset.tableNumber;
    if (!tableNumber || !tableSelect.querySelector(`option[value="${tableNumber}"]`)) return;
    tableSelect.value = tableNumber;
    tableSelect.dispatchEvent(new Event('change', { bubbles: true }));
}

document.querySelectorAll('.vip-seat, .seat-circle, .seat-square').forEach(seat => {
    seat.addEventListener('click', () => selectTableFromChart(seat));
    seat.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectTableFromChart(seat);
    });
});
renderSeatingChart(permanentTableLocks());

const reservationFormEl = document.getElementById('reservationForm');
if (reservationFormEl) reservationFormEl.addEventListener('reset', () => setTimeout(highlightSelectedTable, 0));

// Update seating chart and dropdown when date changes
if (dateInput) dateInput.addEventListener('change', function() {
    const selectedDate = this.value;
    if (selectedDate) {
        // Check if date is locked
        if (isDateLocked(selectedDate)) {
            alert('Esta fecha ya no está disponible para reservar. Las reservaciones se cierran a las 7:00 p. m. de ese día.');
            this.value = '';
            return;
        }
        updateSeatingChartForDate(selectedDate);
        updateTableDropdownForDate(selectedDate);
        applyReservationLimit();
    } else {
        // Keep permanently unavailable tables blocked when the date is cleared
        renderSeatingChart(permanentTableLocks());
        renderTableDropdown(permanentTableLocks());
    }
});

// Per-account limits depend on the date: re-check on every change (also when the date is cleared)
if (dateInput) {
    dateInput.addEventListener('change', applyReservationLimit);
    dateInput.addEventListener('input', applyReservationLimit);
}
if (reservationFormEl) reservationFormEl.addEventListener('reset', () => setTimeout(applyReservationLimit, 0));

// Set reasonable time limits (7 PM to 3 AM as default hours)
const timeInput = document.getElementById('time');
if (timeInput) {
    timeInput.setAttribute('min', '19:00');
    timeInput.setAttribute('max', '23:59'); // Note: Hours extend until 3 AM (next day)
    timeInput.setAttribute('title', 'Horario: 7:00 p. m. - 3:00 a. m.');
}

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50); // colors live in styles.css
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (!href || href === '#') return; // plain "#" links (e.g. Sign up / Login switch) have their own handlers
        const target = document.querySelector(href);
        if (target) {
            const offsetTop = target.offsetTop - navScrollOffset(); // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
});

// Nav links on other pages (Reservations / Contact) go to "/" and pass the section via sessionStorage,
// so the address bar never shows a #hash. On the home page they just smooth-scroll.
document.querySelectorAll('a[data-section]').forEach(function(link) {
    link.addEventListener('click', function(e) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // new tab/window: plain "/"
        var id = link.getAttribute('data-section');
        var target = isHomePage() && document.getElementById(id);
        if (target) {
            e.preventDefault();
            window.scrollTo({ top: target.offsetTop - navScrollOffset(), behavior: 'smooth' });
            return;
        }
        try { sessionStorage.setItem('barScrollToSection', id); } catch (err) {}
    });
});

// Arriving on the home page with a section to show (from the nav links above, or an old /#contact bookmark
// whose hash the <head> script already removed): land on the section just below the fixed navbar
// (same 70px offset as the smooth scroll above), and keep it there while the page finishes loading content.
(function() {
    var id = window.__barLandSection || null;
    try {
        var stored = sessionStorage.getItem('barScrollToSection');
        if (stored) { sessionStorage.removeItem('barScrollToSection'); if (!id) id = stored; }
    } catch (err) {}
    if (!id || !isHomePage()) return;
    var target = document.getElementById(id);
    if (!target || target.tagName !== 'SECTION') return;
    var userScrolled = false;
    ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function(ev) {
        window.addEventListener(ev, function() { userScrolled = true; }, { once: true, passive: true });
    });
    function land() {
        if (userScrolled) return;
        var root = document.documentElement;
        var prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto'; // jump instantly (html has scroll-behavior: smooth)
        window.scrollTo(0, Math.max(0, target.offsetTop - navScrollOffset()));
        root.style.scrollBehavior = prev;
    }
    land();
    window.addEventListener('load', function() {
        land();
        [300, 800, 1500, 2500].forEach(function(ms) { setTimeout(land, ms); });
    });
})();

// A #hash added while already on a page (e.g. typing /#contact in the address bar): show the section
// on the home page, then remove the hash so the address bar stays clean.
window.addEventListener('hashchange', function() {
    var id = '';
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (err) {}
    if (isHomePage()) {
        var target = id && document.getElementById(id);
        if (target && target.tagName === 'SECTION') {
            window.scrollTo({ top: Math.max(0, target.offsetTop - navScrollOffset()), behavior: 'smooth' });
        }
        history.replaceState(null, '', window.location.pathname);
    } else if (window.location.pathname === '/' && (id === 'reservations' || id === 'contact')) {
        // The profile page also shows "/": a home-page section was requested, so go to the home page
        try { sessionStorage.setItem('barScrollToSection', id); } catch (err) {}
        window.location.replace('/');
    } else {
        history.replaceState(null, '', window.location.pathname);
    }
});

// Add animation on scroll (optional enhancement)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe menu items and cards
document.querySelectorAll('.menu-item, .contact-card, .reservation-info, .reservation-form').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Taken tables per date come from the public barTableLocks collection (cached for a few seconds)
var tableLocksCache = {};
function fetchTableLocks(date, fresh) {
    var cached = tableLocksCache[date];
    if (!fresh && cached && Date.now() - cached.at < 5000) return cached.promise;
    var promise;
    if (!firestoreDb) {
        promise = Promise.resolve(permanentTableLocks());
    } else {
        promise = firestoreDb.collection('barTableLocks').where('date', '==', date).get().then(function(snap) {
            var locked = {};
            snap.forEach(function(d) {
                var lock = d.data();
                locked[String(lock.table)] = { orderNumber: lock.orderNumber, time: lock.time || '' };
            });
            return includePermanentTableLocks(locked);
        }).catch(function(err) {
            console.warn('Could not load taken tables:', err && err.code);
            delete tableLocksCache[date];
            return permanentTableLocks();
        });
    }
    tableLocksCache[date] = { at: Date.now(), promise: promise };
    return promise;
}

function invalidateTableLocks(date) {
    delete tableLocksCache[date];
}

// Only draw results for the date that is still selected
function isSelectedDate(date) {
    var input = document.getElementById('date');
    return !input || !input.value || input.value === date;
}

// Function to update seating chart based on selected date
// Shows X (and the reservation time) on tables that are taken
function updateSeatingChartForDate(date, fresh) {
    fetchTableLocks(date, fresh).then(function(reservedTables) {
        if (!isSelectedDate(date)) return;
        renderSeatingChart(reservedTables);
    });
}

function renderSeatingChart(reservedTables) {
    const allSeats = document.querySelectorAll('.vip-seat, .seat-circle, .seat-square');
    
    allSeats.forEach(seat => {
        // Get the seat number from the original content or data attribute
        let seatNumber;
        
        // Check if seat has a data attribute with the number
        if (seat.dataset.tableNumber) {
            seatNumber = parseInt(seat.dataset.tableNumber);
        } else {
            // Try to get from text content (might be a number or X)
            const text = seat.textContent.trim();
            if (!isNaN(parseInt(text)) && text !== '✕') {
                seatNumber = parseInt(text);
                seat.dataset.tableNumber = seatNumber.toString();
            } else {
                return; // Skip if we can't determine the number
            }
        }
        
        const tableKey = seatNumber.toString();
        const lock = reservedTables[tableKey];
        
        if (lock) {
            // Table is taken - show X and time
            const reservationTime = lock.time || '';
            seat.classList.add('reserved');
            seat.classList.toggle('permanently-reserved', !!lock.permanent);
            seat.innerHTML = `
                <span class="reserved-x">✕</span>
                ${reservationTime ? `<span class="reserved-time">${reservationTime}</span>` : ''}
            `;
            seat.title = lock.permanent
                ? 'Reservada permanentemente'
                : `Reservada (orden ${lock.orderNumber})${reservationTime ? ` · Hora: ${reservationTime}` : ''}`;
            seat.setAttribute('aria-disabled', 'true');
            seat.setAttribute('tabindex', '-1');
        } else {
            // Table is available - show number
            seat.classList.remove('reserved');
            seat.classList.remove('permanently-reserved');
            seat.innerHTML = seatNumber.toString();
            seat.title = 'Disponible';
            seat.removeAttribute('aria-disabled');
            seat.setAttribute('tabindex', '0');
        }
    });
    highlightSelectedTable();
}

// Function to update table dropdown based on selected date
// Only shows tables that are NOT taken
function updateTableDropdownForDate(date, fresh) {
    fetchTableLocks(date, fresh).then(function(reservedTables) {
        if (!isSelectedDate(date)) return;
        renderTableDropdown(reservedTables);
    });
}

function renderTableDropdown(reservedTables) {
    const tableSelect = document.getElementById('table');
    if (!tableSelect) return;
    const currentValue = tableSelect.value;
    
    // Clear existing options except the first "Select a table..." option
    tableSelect.innerHTML = '<option value="">Selecciona una mesa...</option>';
    
    // Add all tables 1-50
    for (let i = 1; i <= 50; i++) {
        const tableKey = i.toString();
        // Only add if NOT taken for this date
        if (!Object.prototype.hasOwnProperty.call(reservedTables, tableKey)) {
            const option = document.createElement('option');
            option.value = i;
            if (i <= 11) {
                option.textContent = `Mesa VIP ${i}`;
            } else {
                option.textContent = `Mesa ${i}`;
            }
            tableSelect.appendChild(option);
        }
    }
    
    // Restore previous selection if it's still available
    if (currentValue && !reservedTables.hasOwnProperty(currentValue)) {
        tableSelect.value = currentValue;
    }
    highlightSelectedTable();
}

// Cancellation flow: handled by the inline script in cancel.html (single source of truth).

// Reservation emails: POST to the Google Apps Script web app in email-config.js (webAppUrl).
// Only the Firebase ID token, the order number and (for a cancel) the deleted booking's details are sent;
// the script verifies the token and only emails that account's own address. text/plain = no CORS preflight.
// Empty webAppUrl = emails off. Failures are only logged: the reservation/cancellation is already saved.
function sendReservationEmail(type, orderNumber, details) {
    var url = (typeof EMAIL_CONFIG !== 'undefined' && EMAIL_CONFIG && EMAIL_CONFIG.webAppUrl) || '';
    var user = firebaseAuth && firebaseAuth.currentUser;
    if (!url || !user || typeof fetch !== 'function') return Promise.resolve(false);
    return user.getIdToken().then(function(idToken) {
        var payload = { type: type, orderNumber: String(orderNumber), idToken: idToken };
        if (type === 'cancel' && details) {
            payload.details = { name: details.name, date: details.date, time: details.time, guests: details.guests, table: details.table };
        }
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            redirect: 'follow'
        });
    }).then(function(res) {
        return res.json();
    }).then(function(result) {
        if (result && result.ok) {
            console.log('Reservation email (' + type + ')' + (result.sent ? ' sent' : ' already sent'));
            return true;
        }
        console.warn('Reservation email not sent:', result && result.error);
        return false;
    }).catch(function(err) {
        console.warn('Reservation email failed:', err);
        return false;
    });
}
window.sendReservationEmail = sendReservationEmail;

// Phone number click tracking (optional - for analytics)
document.querySelectorAll('a[href^="tel:"]').forEach(link => {
    link.addEventListener('click', () => {
        console.log('Phone number clicked:', link.textContent);
        // In a real application, you might want to track this with analytics
    });
});

// ============================================
// AUTHENTICATION SYSTEM
// ============================================

// Firebase Auth (Google + Facebook + Email/Password). Config lives in firebase-config.js.
// Google and Facebook sign-in use Firebase's popup flow (redirect if the popup is blocked).
// The Facebook buttons stay hidden until FIREBASE_CONFIG.facebookLogin is true.
var firebaseApp = null;
var firebaseAuth = null;
var accountSetupInProgress = false;

function isLoginPage() {
    return /(^|\/)login(\.html)?$/.test(window.location.pathname || '');
}

// Build the site's currentUser object from a Firebase user (name, email, photo)
function saveFirebaseUser(user) {
    if (!user) return null;
    var providers = user.providerData || [];
    var googleProfile = providers.filter(function(p) { return p && p.providerId === 'google.com'; })[0] || null;
    var facebookProfile = providers.filter(function(p) { return p && p.providerId === 'facebook.com'; })[0] || null;
    var socialProfile = googleProfile || facebookProfile;
    var displayName = (user.displayName || (socialProfile && socialProfile.displayName) || '').trim();
    var email = user.email || (socialProfile && socialProfile.email) || '';
    var parts = displayName.split(/\s+/).filter(Boolean);
    currentUser = {
        firstName: parts[0] || (email ? email.split('@')[0] : '') || 'Usuario',
        lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
        displayName: displayName,
        email: email,
        photoURL: user.photoURL || (socialProfile && socialProfile.photoURL) || '',
        uid: user.uid,
        isGoogle: !!googleProfile,
        isFacebook: !!facebookProfile,
        createdAt: (user.metadata && user.metadata.creationTime) || new Date().toISOString()
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    return currentUser;
}

// Called after a successful Google or Facebook sign-in (popup or redirect)
function onSocialSignedIn(user, providerName) {
    var u = saveFirebaseUser(user);
    if (!u) return;
    if (isLoginPage()) {
        window.location.href = barPostLoginUrl();
        return;
    }
    if (typeof closeAuthModal === 'function') closeAuthModal();
    checkLoginStatus();
    alert('¡Hola, ' + u.firstName + '! Iniciaste sesión con ' + (providerName || 'Google') + '.');
}

function onGoogleSignedIn(user) {
    onSocialSignedIn(user, 'Google');
}

// "Google" / "Facebook" from a Firebase provider id (google.com, facebook.com)
function providerLabel(providerId) {
    return providerId === 'facebook.com' ? 'Facebook' : 'Google';
}

function facebookLoginEnabled() {
    return typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG.facebookLogin === true;
}

function initFirebaseAuth() {
    if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.enabled ||
        !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.indexOf('YOUR_') === 0) {
        return;
    }
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    try {
        firebaseApp = firebase.app();
    } catch (e) {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    }
    firebaseAuth = firebase.auth();
    try { firebaseAuth.languageCode = 'es'; } catch (e) {} // Firebase sign-in windows and messages in Spanish
    // Reservations database (pages that load firebase-firestore-compat.js)
    if (firebase.firestore) {
        try { firestoreDb = firebase.firestore(); } catch (e) { firestoreDb = null; }
    }
    // Local testing only: localhost + localStorage.barUseEmulator = '1' talks to the Firebase emulators
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && localStorage.getItem('barUseEmulator') === '1') {
        try { firebaseAuth.useEmulator('http://127.0.0.1:9099'); } catch (e) {}
        try { if (firestoreDb) firestoreDb.useEmulator('127.0.0.1', 8080); } catch (e) {}
    }

    // Finish a redirect sign-in (only used when the popup was blocked)
    firebaseAuth.getRedirectResult().then(function(result) {
        if (result && result.user) {
            var pid = (result.additionalUserInfo && result.additionalUserInfo.providerId) ||
                (result.credential && result.credential.providerId) || 'google.com';
            onSocialSignedIn(result.user, providerLabel(pid));
        }
    }).catch(function(err) {
        if (err && err.code) showSocialSignInError(err, providerLabel(err.credential && err.credential.providerId));
    });

    firebaseAuth.onAuthStateChanged(function(user) {
        if (user) {
            saveFirebaseUser(user);
            checkLoginStatus();
            // (sign-up / account migration redirect themselves once the name is saved)
            if (isLoginPage() && !accountSetupInProgress) {
                window.location.href = barPostLoginUrl();
            }
        } else {
            // Not signed in to Firebase: drop any stored session, including old browser-only
            // accounts (reservations need a real Firebase account; logging in again migrates them)
            var stored = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (stored) {
                currentUser = null;
                localStorage.removeItem('currentUser');
                checkLoginStatus();
            }
        }
        if (authReadyResolve) { authReadyResolve(); authReadyResolve = null; }
    });
}

initFirebaseAuth();

function showSocialSignInError(err, providerName) {
    var name = providerName || 'Google';
    var code = (err && err.code) || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' ||
        code === 'auth/user-cancelled') {
        return; // user just closed the sign-in window
    }
    console.error(name + ' sign-in error:', err);
    var msg;
    if (code === 'auth/unauthorized-domain') {
        msg = 'El inicio de sesión con ' + name + ' todavía no está permitido en esta dirección (' + window.location.hostname +
            '). Agrégala en Firebase Console > Authentication > Settings > Authorized domains.';
    } else if (code === 'auth/operation-not-allowed') {
        msg = 'El inicio de sesión con ' + name + ' todavía no está activado en este sitio. Inicia sesión con tu correo y contraseña' +
            (name === 'Facebook' ? ' o con Google.' : '.');
    } else if (code === 'auth/account-exists-with-different-credential') {
        var email = (err && (err.email || (err.customData && err.customData.email))) || '';
        msg = 'Ya tienes una cuenta de Bar Chinesca' + (email ? ' con ' + email : ' con este correo') +
            '. Inicia sesión como lo hiciste la primera vez (correo y contraseña' +
            (name === 'Facebook' ? ' o Google' : ' o Facebook') + ').';
    } else if (code === 'auth/network-request-failed') {
        msg = 'Error de red. Revisa tu conexión y vuelve a intentarlo.';
    } else {
        msg = 'No se pudo iniciar sesión con ' + name + '. Vuelve a intentarlo.' + (code ? ' (' + code + ')' : '');
    }
    alert(msg);
}

function showGoogleSignInError(err) {
    showSocialSignInError(err, 'Google');
}

function showFacebookSignInError(err) {
    showSocialSignInError(err, 'Facebook');
}

// Sign in with Google: popup first (works on desktop and mobile), redirect if the popup is blocked
function signInWithGoogle() {
    if (!firebaseAuth || typeof firebase === 'undefined') {
        alert('El inicio de sesión con Google no está disponible en este momento. Recarga la página y vuelve a intentarlo.');
        return;
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.setCustomParameters({ prompt: 'select_account' });
    // Must be called directly from the click so the browser allows the popup
    firebaseAuth.signInWithPopup(provider).then(function(result) {
        if (result && result.user) onGoogleSignedIn(result.user);
    }).catch(function(err) {
        var code = (err && err.code) || '';
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment' ||
            code === 'auth/web-storage-unsupported') {
            firebaseAuth.signInWithRedirect(provider).catch(showGoogleSignInError);
            return;
        }
        showGoogleSignInError(err);
    });
}

// Sign in with Facebook: same flow as Google (popup first, redirect if the popup is blocked)
function signInWithFacebook() {
    if (!firebaseAuth || typeof firebase === 'undefined') {
        alert('El inicio de sesión con Facebook no está disponible en este momento. Recarga la página y vuelve a intentarlo.');
        return;
    }
    var provider = new firebase.auth.FacebookAuthProvider();
    provider.addScope('email');
    provider.addScope('public_profile');
    provider.setCustomParameters({ display: 'popup' });
    // Must be called directly from the click so the browser allows the popup
    firebaseAuth.signInWithPopup(provider).then(function(result) {
        if (result && result.user) onSocialSignedIn(result.user, 'Facebook');
    }).catch(function(err) {
        var code = (err && err.code) || '';
        if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment' ||
            code === 'auth/web-storage-unsupported') {
            firebaseAuth.signInWithRedirect(provider).catch(showFacebookSignInError);
            return;
        }
        showFacebookSignInError(err);
    });
}

// Sign out everywhere (Firebase + local session), then run callback
var isSigningOut = false;
function clearLocalSession() {
    currentUser = null;
    try {
        localStorage.removeItem('currentUser');
        sessionStorage.removeItem('currentUser');
        // Any Firebase auth leftovers kept in web storage (signOut normally clears these)
        [localStorage, sessionStorage].forEach(function(store) {
            for (var i = store.length - 1; i >= 0; i--) {
                var key = store.key(i);
                if (key && (key.indexOf('firebase:authUser:') === 0 || key.indexOf('firebase:pendingRedirect:') === 0 ||
                    key.indexOf('firebase:redirectUser:') === 0)) {
                    store.removeItem(key);
                }
            }
        });
    } catch (e) {}
}
function signOutUser(callback) {
    isSigningOut = true;
    window.isSigningOut = true;
    var finished = false;
    var done = function() {
        if (finished) return;
        finished = true;
        clearLocalSession();
        if (typeof callback === 'function') callback();
    };
    if (firebaseAuth) {
        firebaseAuth.signOut().then(done, done);
        setTimeout(done, 4000); // don't leave the user stuck if Firebase never answers
    } else {
        done();
    }
}
window.signOutUser = signOutUser;

function isHomePage() {
    // Detect by content, not the URL: the profile page also shows "/" in the address bar
    return !!document.getElementById('reservationForm');
}

// Header "Sign out" button: sign out, reset the header, go back to the home page
function handleSignOutClick(e) {
    if (e) e.preventDefault();
    var btn = e && e.currentTarget;
    if (btn) btn.disabled = true;
    var prevUser = currentUser;
    signOutUser(function() {
        if (!isHomePage()) {
            window.location.href = '/';
            return;
        }
        // Already on the home page: clear the prefilled reservation name/email and show Login again
        var nameInput = document.getElementById('name');
        var emailInput = document.getElementById('email');
        if (prevUser) {
            var prevName = ((prevUser.firstName || '') + ' ' + (prevUser.lastName || ''));
            if (nameInput && nameInput.value === prevName) nameInput.value = '';
            if (emailInput && emailInput.value === prevUser.email) emailInput.value = '';
        }
        isSigningOut = false;
        window.isSigningOut = false;
        checkLoginStatus();
        if (btn) btn.disabled = false;
    });
}

function initSignOutButtons() {
    var buttons = document.querySelectorAll('.js-signout-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].onclick = handleSignOutClick;
    }
}

// Wire up the "Continue with Google" / "Continue with Facebook" buttons (login + signup views)
window.initGoogleSignIn = function() {
    var buttons = document.querySelectorAll('.js-google-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].onclick = function(e) {
            if (e) e.preventDefault();
            signInWithGoogle();
        };
    }
    // Facebook buttons are shipped hidden; show them once Facebook is enabled in firebase-config.js
    var fbOn = facebookLoginEnabled();
    var fbWraps = document.querySelectorAll('.facebook-signin-container');
    for (var j = 0; j < fbWraps.length; j++) {
        fbWraps[j].hidden = !fbOn;
    }
    var fbButtons = document.querySelectorAll('.js-facebook-btn');
    for (var k = 0; k < fbButtons.length; k++) {
        fbButtons[k].onclick = function(e) {
            if (e) e.preventDefault();
            if (facebookLoginEnabled()) signInWithFacebook();
        };
    }
    if (fbOn) {
        var intros = document.querySelectorAll('.auth-form-intro[data-facebook-text]');
        for (var m = 0; m < intros.length; m++) {
            intros[m].textContent = intros[m].getAttribute('data-facebook-text');
        }
    }
};

// Check if user is logged in and update UI
function checkLoginStatus() {
    currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    userAccounts = JSON.parse(localStorage.getItem('userAccounts')) || {};
    
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    
    // Hide Login nav link when user is logged in
    var navLoginItem = document.getElementById('navLoginItem');
    if (navLoginItem) {
        navLoginItem.style.display = currentUser ? 'none' : '';
    }

    // Show the header "Sign out" button only when signed in (see .nav-signout in styles.css)
    document.documentElement.classList.toggle('is-signed-in', !!currentUser);

    // Reservation form: show/hide the 2-tables-per-account notice
    updateReservationLimitNotice();

    // Show the Google profile photo in the navbar profile icon when signed in
    var profileIcons = document.querySelectorAll('.profile-icon');
    for (var pi = 0; pi < profileIcons.length; pi++) {
        var icon = profileIcons[pi];
        var svg = icon.querySelector('svg');
        var img = icon.querySelector('img.profile-avatar');
        if (currentUser && currentUser.photoURL) {
            if (!img) {
                img = document.createElement('img');
                img.className = 'profile-avatar';
                img.alt = '';
                img.referrerPolicy = 'no-referrer';
                img.onerror = function() { this.remove(); var s = this.parentNode && this.parentNode.querySelector('svg'); if (s) s.style.display = ''; };
                icon.appendChild(img);
            }
            img.src = currentUser.photoURL;
            if (svg) svg.style.display = 'none';
        } else {
            if (img) img.remove();
            if (svg) svg.style.display = '';
        }
    }
    initAvatarMenus();
    
    if (currentUser) {
        // User is logged in - fill form with user info (but don't disable fields)
        if (nameInput) {
            nameInput.value = (currentUser.firstName || '') + ' ' + (currentUser.lastName || '');
        }
        if (emailInput) {
            emailInput.value = currentUser.email;
        }
    }
    // If not logged in, leave fields empty but enabled - user can fill them out
}

// Auth Modal Functions
function showAuthModal(formType = 'login') {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (modal) {
        modal.style.display = 'block';
        
        if (formType === 'login') {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
        } else {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
        }
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Login Function (Firebase Email/Password or fallback to localStorage)
function handleLogin(email, password) {
    if (firebaseAuth) {
        firebaseAuth.signInWithEmailAndPassword(email, password)
            .then(function() {
                if (!document.getElementById('authModal')) {
                    showLoginPageMessage('Sesión iniciada. Redirigiendo…');
                    window.location.href = barPostLoginUrl();
                    return;
                }
                closeAuthModal();
                checkLoginStatus();
                alert('¡Sesión iniciada! Qué gusto verte de nuevo.');
            })
            .catch(function(err) {
                // Old browser-only account (made before accounts moved to Firebase): move it to Firebase now
                var legacyAccounts = JSON.parse(localStorage.getItem('userAccounts')) || {};
                var legacy = legacyAccounts[email];
                var notFound = err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' ||
                    err.code === 'auth/invalid-login-credentials';
                if (legacy && legacy.password === password && notFound) {
                    migrateLegacyAccount(legacy, email, password);
                    return;
                }
                if (err.code === 'auth/user-not-found') alert('No hay ninguna cuenta con este correo. Primero regístrate.');
                else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' ||
                    err.code === 'auth/invalid-login-credentials') alert('Correo o contraseña incorrectos. Vuelve a intentarlo.');
                else if (err.code === 'auth/invalid-email') alert('El correo electrónico no es válido.');
                else alert('No se pudo iniciar sesión. Vuelve a intentarlo.' + (err && err.code ? ' (' + err.code + ')' : ''));
            });
        return;
    }
    userAccounts = JSON.parse(localStorage.getItem('userAccounts')) || {};
    if (userAccounts[email]) {
        if (userAccounts[email].password === password) {
            currentUser = {
                firstName: userAccounts[email].firstName,
                lastName: userAccounts[email].lastName,
                email: userAccounts[email].email,
                createdAt: userAccounts[email].createdAt
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            if (!document.getElementById('authModal')) {
                showLoginPageMessage('Sesión iniciada. Redirigiendo…');
                window.location.href = barPostLoginUrl();
                return;
            }
            closeAuthModal();
            checkLoginStatus();
            alert('¡Sesión iniciada! Qué gusto verte de nuevo, ' + currentUser.firstName + '.');
        } else {
            alert('Contraseña incorrecta. Vuelve a intentarlo.');
        }
    } else {
        alert('No encontramos esa cuenta. Primero crea una cuenta.');
    }
}

// Create the Firebase account for an old browser-only account, then continue as a normal login
function migrateLegacyAccount(legacy, email, password) {
    accountSetupInProgress = true;
    firebaseAuth.createUserWithEmailAndPassword(email, password)
        .then(function(cred) {
            return cred.user.updateProfile({ displayName: ((legacy.firstName || '') + ' ' + (legacy.lastName || '')).trim() })
                .then(function() { saveFirebaseUser(cred.user); });
        })
        .then(function() {
            accountSetupInProgress = false;
            var accounts = JSON.parse(localStorage.getItem('userAccounts')) || {};
            delete accounts[email];
            localStorage.setItem('userAccounts', JSON.stringify(accounts));
            if (!document.getElementById('authModal')) {
                showLoginPageMessage('Sesión iniciada. Redirigiendo…');
                window.location.href = barPostLoginUrl();
                return;
            }
            closeAuthModal();
            checkLoginStatus();
            alert('¡Sesión iniciada! Qué gusto verte de nuevo.');
        })
        .catch(function(err) {
            accountSetupInProgress = false;
            if (err.code === 'auth/email-already-in-use') alert('Correo o contraseña incorrectos. Vuelve a intentarlo.');
            else alert('No se pudo iniciar sesión. Vuelve a intentarlo.' + (err && err.code ? ' (' + err.code + ')' : ''));
        });
}

function showLoginPageMessage(text) {
    var el = document.getElementById('loginPageMessage');
    if (el) {
        el.textContent = text;
        el.style.display = 'block';
        el.className = 'login-page-message login-page-message-show';
    }
}

// Create account with name + email + password only, then log in immediately (no security code, no verification)
function createAccountAndLogIn(firstName, lastName, email, password) {
    userAccounts = JSON.parse(localStorage.getItem('userAccounts')) || {};
    if (userAccounts[email]) {
        alert('Ya existe una cuenta con este correo. Mejor inicia sesión.');
        return false;
    }
    var newUser = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        createdAt: new Date().toISOString()
    };
    userAccounts[email] = newUser;
    localStorage.setItem('userAccounts', JSON.stringify(userAccounts));
    currentUser = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        createdAt: newUser.createdAt
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    if (!document.getElementById('authModal')) {
        showLoginPageMessage('Cuenta creada. Redirigiendo…');
        window.location.href = barPostLoginUrl();
        return true;
    }
    closeAuthModal();
    checkLoginStatus();
    alert('Cuenta creada.');
    return true;
}

// Signup: first name, last name, email, password only. Account created and you're logged in (no code, no verification).
function handleSignup(firstName, lastName, email, password) {
    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres.');
        return;
    }
    if (firebaseAuth && typeof firebase !== 'undefined') {
        accountSetupInProgress = true;
        firebaseAuth.createUserWithEmailAndPassword(email, password)
            .then(function(cred) {
                return cred.user.updateProfile({ displayName: (firstName + ' ' + lastName).trim() })
                    .then(function() { saveFirebaseUser(cred.user); });
            })
            .then(function() {
                accountSetupInProgress = false;
                if (!document.getElementById('authModal')) {
                    showLoginPageMessage('Cuenta creada. Redirigiendo…');
                    window.location.href = barPostLoginUrl();
                    return;
                }
                closeAuthModal();
                checkLoginStatus();
                alert('Cuenta creada.');
            })
            .catch(function(err) {
                accountSetupInProgress = false;
                if (err.code === 'auth/email-already-in-use') {
                    alert('Ya existe una cuenta con este correo. Mejor inicia sesión.');
                    return;
                }
                if (err.code === 'auth/weak-password') {
                    alert('La contraseña es muy débil. Usa al menos 6 caracteres.');
                    return;
                }
                if (err.code === 'auth/invalid-email') {
                    alert('El correo electrónico no es válido.');
                    return;
                }
                // Accounts must be real Firebase accounts (reservations are tied to them)
                if (err.code === 'auth/network-request-failed') {
                    alert('Error de red. Revisa tu conexión y vuelve a intentarlo.');
                    return;
                }
                alert('No pudimos crear tu cuenta. Vuelve a intentarlo.' + (err && err.code ? ' (' + err.code + ')' : ''));
            });
        return;
    }
    createAccountAndLogIn(firstName, lastName, email, password);
}

// Initialize auth system when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    initSignOutButtons();
    if (typeof initGoogleSignIn === 'function') {
        setTimeout(initGoogleSignIn, 300);
    }
    
    // Auth modal event listeners
    const authModal = document.getElementById('authModal');
    const loginFormElement = document.getElementById('loginFormElement');
    const signupFormElement = document.getElementById('signupFormElement');
    const showLoginLink = document.getElementById('showLoginLink');
    const showSignupLink = document.getElementById('showSignupLink');
    const switchToSignup = document.getElementById('switchToSignup');
    const switchToLogin = document.getElementById('switchToLogin');
    const authClose = document.querySelector('.auth-close');
    
    // Show login modal
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            showAuthModal('login');
        });
    }
    
    // Show signup modal
    if (showSignupLink) {
        showSignupLink.addEventListener('click', function(e) {
            e.preventDefault();
            showAuthModal('signup');
        });
    }
    
    // Switch to signup
    if (switchToSignup) {
        switchToSignup.addEventListener('click', function(e) {
            e.preventDefault();
            showAuthModal('signup');
        });
    }
    
    // Switch to login
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            showAuthModal('login');
        });
    }
    
    // Close modal
    if (authClose) {
        authClose.addEventListener('click', closeAuthModal);
    }
    
    if (authModal) {
        authModal.addEventListener('click', function(e) {
            if (e.target === authModal) {
                closeAuthModal();
            }
        });
    }
    
    // Login form submit (index.html modal; login.html wires its own forms)
    if (loginFormElement && authModal) {
        loginFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            if (email && password) {
                handleLogin(email, password);
            }
        });
    }
    
    // Signup form submit (index.html modal; login.html wires its own forms)
    if (signupFormElement && authModal) {
        signupFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            const firstName = document.getElementById('signupFirstName').value.trim();
            const lastName = document.getElementById('signupLastName').value.trim();
            const email = document.getElementById('signupEmail').value.trim();
            const password = document.getElementById('signupPassword').value;
            if (firstName && lastName && email && password) {
                handleSignup(firstName, lastName, email, password);
            }
        });
    }
});

// ---------------------------------------------------------------------------------------------
// Shared helpers for the guest pages: long Spanish dates, table labels, iOS-style alert,
// the avatar menu (tap your picture -> "Mi perfil" / "Salir") and the reservations a guest can cancel.
// ---------------------------------------------------------------------------------------------

// "2026-09-26" -> "Sábado 26 de septiembre de 2026"
function barDateLong(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return date || '';
    var d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10), 12));
    var s;
    try {
        s = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    } catch (e) {
        return date;
    }
    s = s.replace(',', '');
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function barTableLabel(t) {
    return Number(t) <= 11 ? 'Mesa VIP ' + t : 'Mesa ' + t;
}
window.barDateLong = barDateLong;
window.barTableLabel = barTableLabel;

// Upcoming reservations the signed-in guest can still cancel: night not over, not verified at the door,
// not cancelled. Soonest first.
function barCancellable(list) {
    return (list || []).filter(function(r) {
        return r && r.orderNumber && !barHoldsNoTable(r) && !r.checkedIn && r.status !== 'cancelled';
    }).sort(function(a, b) {
        return String(a.date + ' ' + a.time).localeCompare(String(b.date + ' ' + b.time));
    });
}
window.barCancellable = barCancellable;

// Where to go after signing in: back to /cancel when the guest came from there, otherwise the profile
function barPostLoginUrl() {
    try {
        if (sessionStorage.getItem('barAfterLogin') === '/cancel') return '/cancel';
    } catch (e) {}
    return '/profile';
}
window.barPostLoginUrl = barPostLoginUrl;

// iOS-style alert in the Chinesca colours. Resolves with the chosen button/option value.
// opts: { title, message, details: [lines], options: [{label, sub, value}], buttons: [{label, value, role: 'cancel'|'destructive'|'default'}], id }
function barAlert(opts) {
    opts = opts || {};
    return new Promise(function(resolve) {
        var prevFocus = document.activeElement;
        var old = document.querySelector('.bar-alert-backdrop');
        if (old) old.remove();
        var back = document.createElement('div');
        back.className = 'bar-alert-backdrop';
        var box = document.createElement('div');
        box.className = 'bar-alert';
        if (opts.id) box.id = opts.id;
        box.setAttribute('role', 'alertdialog');
        box.setAttribute('aria-modal', 'true');
        var body = document.createElement('div');
        body.className = 'bar-alert-body';
        var title = document.createElement('h2');
        title.className = 'bar-alert-title';
        title.id = 'barAlertTitle';
        title.textContent = opts.title || '';
        box.setAttribute('aria-labelledby', 'barAlertTitle');
        body.appendChild(title);
        if (opts.message) {
            var msg = document.createElement('p');
            msg.className = 'bar-alert-message';
            msg.id = 'barAlertMessage';
            msg.textContent = opts.message;
            box.setAttribute('aria-describedby', 'barAlertMessage');
            body.appendChild(msg);
        }
        if (opts.details && opts.details.length) {
            var dl = document.createElement('div');
            dl.className = 'bar-alert-details';
            opts.details.forEach(function(line, i) {
                var p = document.createElement('p');
                p.className = 'bar-alert-detail' + (i === 0 ? ' is-main' : '') + (line && line.small ? ' is-small' : '');
                p.textContent = (line && line.text) || line;
                dl.appendChild(p);
            });
            body.appendChild(dl);
        }
        box.appendChild(body);
        var finished = false;
        function close(value) {
            if (finished) return;
            finished = true;
            document.removeEventListener('keydown', onKey, true);
            back.classList.add('is-closing');
            document.documentElement.classList.remove('bar-alert-open');
            setTimeout(function() { back.remove(); }, 160);
            if (prevFocus && typeof prevFocus.focus === 'function' && document.contains(prevFocus)) {
                try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
            }
            resolve(value);
        }
        if (opts.options && opts.options.length) {
            var list = document.createElement('div');
            list.className = 'bar-alert-options';
            list.setAttribute('role', 'group');
            opts.options.forEach(function(o) {
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'bar-alert-option';
                if (o.value != null) b.setAttribute('data-value', o.value);
                var main = document.createElement('span');
                main.className = 'bar-alert-option-main';
                main.textContent = o.label;
                b.appendChild(main);
                if (o.sub) {
                    var sub = document.createElement('span');
                    sub.className = 'bar-alert-option-sub';
                    sub.textContent = o.sub;
                    b.appendChild(sub);
                }
                b.onclick = function() { close(o.value); };
                list.appendChild(b);
            });
            box.appendChild(list);
        }
        var buttons = opts.buttons && opts.buttons.length ? opts.buttons : [{ label: 'Aceptar', value: true }];
        var row = document.createElement('div');
        row.className = 'bar-alert-buttons' + (buttons.length === 2 ? ' is-row' : '');
        var cancelValue = null;
        buttons.forEach(function(bt) {
            var b = document.createElement('button');
            b.type = 'button';
            b.className = 'bar-alert-btn' + (bt.role === 'cancel' ? ' is-cancel' : '') + (bt.role === 'destructive' ? ' is-destructive' : '');
            b.textContent = bt.label;
            if (bt.id) b.id = bt.id;
            if (bt.role === 'cancel') cancelValue = bt.value;
            b.onclick = function() { close(bt.value); };
            row.appendChild(b);
        });
        if (buttons.length === 1) cancelValue = buttons[0].value;
        box.appendChild(row);
        back.appendChild(box);
        function onKey(e) {
            if (e.key === 'Escape') { e.preventDefault(); close(cancelValue); }
            if (e.key === 'Tab') { // keep focus inside the alert
                var f = box.querySelectorAll('button');
                if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (document.activeElement === box) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
                else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        }
        document.addEventListener('keydown', onKey, true);
        document.documentElement.classList.add('bar-alert-open');
        document.body.appendChild(back);
        // focus the alert itself (no ring on a button, like iOS); Tab moves into the buttons
        box.tabIndex = -1;
        try { box.focus({ preventScroll: true }); } catch (e) {}
    });
}
window.barAlert = barAlert;

// ---- Avatar menu: tapping your picture opens a small menu with "Mi perfil" and "Salir" ----
function closeAvatarMenu() {
    var menu = document.getElementById('avatarMenu');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    var anchors = document.querySelectorAll('[data-avatar-anchor][aria-expanded="true"]');
    for (var i = 0; i < anchors.length; i++) anchors[i].setAttribute('aria-expanded', 'false');
}
function positionAvatarMenu(menu, anchor) {
    var r = anchor.getBoundingClientRect();
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var w = Math.min(232, vw - 16);
    menu.style.width = w + 'px';
    var left = Math.round(r.right - w);
    if (r.left + r.width / 2 < vw / 2) left = Math.round(r.left); // anchor on the left half: open to the right
    left = Math.max(8, Math.min(left, vw - w - 8));
    menu.style.left = left + 'px';
    menu.style.top = Math.round(r.bottom + 8) + 'px';
    var tipX = Math.max(14, Math.min(w - 14, Math.round(r.left + r.width / 2 - left)));
    menu.style.setProperty('--tip-x', tipX + 'px');
}
function openAvatarMenu(anchor) {
    var menu = document.getElementById('avatarMenu');
    if (!menu) return;
    if (!menu.hidden && menu._anchor === anchor) { closeAvatarMenu(); return; }
    closeAvatarMenu();
    menu._anchor = anchor;
    menu.hidden = false;
    positionAvatarMenu(menu, anchor);
    anchor.setAttribute('aria-expanded', 'true');
    var first = menu.querySelector('.avatar-menu-item');
    if (first) {
        try { first.focus({ preventScroll: true }); } catch (e) {}
    }
}
function buildAvatarMenu() {
    var menu = document.getElementById('avatarMenu');
    if (!currentUser) {
        if (menu) menu.remove();
        return null;
    }
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'avatarMenu';
        menu.className = 'avatar-menu';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-label', 'Tu cuenta');
        menu.hidden = true;
        // on the profile page the "Salir" item keeps the old logout button id
        var logoutId = document.getElementById('profileContent') ? 'logoutBtn' : 'avatarLogoutBtn';
        menu.innerHTML =
            '<div class="avatar-menu-head"><span class="avatar-menu-name"></span><span class="avatar-menu-email"></span></div>' +
            '<a href="/profile" class="avatar-menu-item" role="menuitem" id="avatarProfileLink">Mi perfil</a>' +
            '<button type="button" class="avatar-menu-item is-danger" role="menuitem" id="' + logoutId + '">Salir</button>';
        document.body.appendChild(menu);
        var out = menu.querySelector('.avatar-menu-item.is-danger');
        out.addEventListener('click', function(e) {
            e.preventDefault();
            out.disabled = true;
            out.textContent = 'Saliendo…';
            signOutUser(function() { window.location.href = '/'; });
        });
        menu.addEventListener('keydown', function(e) {
            var items = [].slice.call(menu.querySelectorAll('.avatar-menu-item'));
            var i = items.indexOf(document.activeElement);
            if (e.key === 'Escape') {
                e.preventDefault();
                var a = menu._anchor;
                closeAvatarMenu();
                if (a) a.focus();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                var n = e.key === 'ArrowDown' ? i + 1 : i - 1;
                items[(n + items.length) % items.length].focus();
            }
        });
    }
    var name = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim();
    menu.querySelector('.avatar-menu-name').textContent = name || 'Tu cuenta';
    menu.querySelector('.avatar-menu-email').textContent = currentUser.email || '';
    return menu;
}
function wireAvatarAnchor(el) {
    if (el.getAttribute('data-avatar-anchor')) return;
    el.setAttribute('data-avatar-anchor', '1');
    el.addEventListener('click', function(e) {
        if (!currentUser || !document.getElementById('avatarMenu')) return; // signed out: the icon is a normal link
        e.preventDefault();
        e.stopPropagation();
        openAvatarMenu(el);
    });
    el.addEventListener('keydown', function(e) {
        if (el.tagName !== 'A' && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            el.click();
        }
    });
}
function initAvatarMenus() {
    var menu = buildAvatarMenu();
    var anchors = document.querySelectorAll('.profile-icon, .profile-user-photo');
    for (var i = 0; i < anchors.length; i++) {
        var el = anchors[i];
        wireAvatarAnchor(el);
        if (menu) {
            el.setAttribute('aria-haspopup', 'menu');
            el.setAttribute('aria-controls', 'avatarMenu');
            el.setAttribute('aria-expanded', 'false');
            if (el.classList.contains('profile-icon')) {
                el.setAttribute('title', 'Tu cuenta');
                el.setAttribute('aria-label', 'Tu cuenta: Mi perfil o Salir');
            } else {
                el.setAttribute('role', 'button');
                el.setAttribute('tabindex', '0');
                el.setAttribute('aria-label', 'Tu cuenta: Mi perfil o Salir');
            }
        } else {
            el.removeAttribute('aria-haspopup');
            el.removeAttribute('aria-controls');
            el.removeAttribute('aria-expanded');
            if (el.classList.contains('profile-icon')) {
                el.setAttribute('title', 'Mi perfil');
                el.setAttribute('aria-label', 'Mi perfil');
            }
        }
    }
}
window.initAvatarMenus = initAvatarMenus;
document.addEventListener('click', function(e) {
    var menu = document.getElementById('avatarMenu');
    if (!menu || menu.hidden) return;
    if (menu.contains(e.target)) return;
    closeAvatarMenu();
});
window.addEventListener('resize', function() {
    var menu = document.getElementById('avatarMenu');
    if (menu && !menu.hidden && menu._anchor) positionAvatarMenu(menu, menu._anchor);
});
window.addEventListener('scroll', function() {
    var menu = document.getElementById('avatarMenu');
    if (menu && !menu.hidden && menu._anchor) positionAvatarMenu(menu, menu._anchor);
}, { passive: true });
