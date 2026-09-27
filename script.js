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
    console.log('Table:', testTable <= 4 ? `VIP Table ${testTable}` : `Table ${testTable}`);
    console.log('Date:', testDate);
    console.log('Order details:', orderDetails[orderKey]);
    console.log('\nYou can now use order number', orderKey, 'to test the cancellation flow.');
    
    alert('Test order created!\n\nOrder Number: ' + orderKey + '\nTable: ' + (testTable <= 4 ? 'VIP Table ' : 'Table ') + testTable + '\nDate: ' + testDate + '\n\nYou can now cancel this reservation using the order number.');
    
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

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        if (!hamburger || !navMenu) return;
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

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
//   barUserCounts/{uid}            how many tables the user holds (max 2, enforced by the security rules)
// ============================================
var MAX_TABLES_PER_ACCOUNT = 2;
var TABLE_LIMIT_MESSAGE = 'You can only reserve 2 tables per account. Cancel an existing reservation to book another.';
var SIGN_IN_TO_RESERVE_MESSAGE = 'Please <a href="/login">log in</a> to reserve a table. Each account can reserve up to 2 tables.';
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

// Cancel = delete the reservation + its table lock and decrement the user's counter, all at once
function cancelBarReservation(orderNumber) {
    return whenAuthReady().then(function(user) {
        if (!user || !firestoreDb) throw barError('bar/signed-out');
        var resRef = firestoreDb.collection('barReservations').doc(String(orderNumber));
        var countRef = firestoreDb.collection('barUserCounts').doc(user.uid);
        return firestoreDb.runTransaction(function(t) {
            return Promise.all([t.get(resRef), t.get(countRef)]).then(function(snaps) {
                if (!snaps[0].exists) throw barError('bar/not-found');
                var res = snaps[0].data();
                if (res.uid !== user.uid) throw barError('bar/not-found');
                var count = snaps[1].exists ? (snaps[1].data().count || 0) : 0;
                t.delete(resRef);
                t.delete(firestoreDb.collection('barTableLocks').doc(barLockId(res.date, res.table)));
                t.set(countRef, {
                    count: Math.max(0, count - 1),
                    lastOrder: String(orderNumber),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                return res;
            });
        }).then(function(res) {
            invalidateTableLocks(res.date);
            return res;
        });
    });
}
window.cancelBarReservation = cancelBarReservation;

// Past-dated reservations no longer hold a table: cancel the user's own ones (frees their counter)
function cancelPastReservations(uid) {
    var today = localDateString(new Date());
    return getMyReservations(uid).then(function(list) {
        var past = list.filter(function(r) { return r.date && r.date < today; });
        return past.reduce(function(p, r) {
            return p.then(function() {
                return cancelBarReservation(r.orderNumber).catch(function(err) {
                    console.warn('Could not clear past reservation', r.orderNumber, err && err.code);
                });
            });
        }, Promise.resolve()).then(function() {
            return list.filter(function(r) { return !(r.date && r.date < today); });
        });
    });
}

// Book one table: reservation + table lock + counter in one transaction (the rules re-check all of it)
function bookTableInFirestore(user, formData) {
    var table = parseInt(formData.table, 10);
    var lockRef = firestoreDb.collection('barTableLocks').doc(barLockId(formData.date, table));
    var countRef = firestoreDb.collection('barUserCounts').doc(user.uid);
    var attempts = 0;
    function attempt() {
        attempts++;
        var orderNumber = String(Math.floor(100000 + Math.random() * 900000));
        var resRef = firestoreDb.collection('barReservations').doc(orderNumber);
        return firestoreDb.runTransaction(function(t) {
            return Promise.all([t.get(lockRef), t.get(countRef), t.get(resRef)]).then(function(snaps) {
                if (snaps[0].exists) throw barError('bar/table-taken', { orderNumber: snaps[0].data().orderNumber });
                var count = snaps[1].exists ? (snaps[1].data().count || 0) : 0;
                if (count >= MAX_TABLES_PER_ACCOUNT) throw barError('bar/limit');
                if (snaps[2].exists) throw barError('bar/order-number-taken');
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
                    createdAt: ts
                });
                t.set(lockRef, { date: formData.date, table: table, time: formData.time, orderNumber: orderNumber, createdAt: ts });
                t.set(countRef, { count: count + 1, lastOrder: orderNumber, updatedAt: ts });
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

// Show the limit message as soon as a signed-in user already holds 2 tables (today or later)
function updateReservationLimitNotice() {
    if (!document.getElementById('reservationForm')) return;
    var user = JSON.parse(localStorage.getItem('currentUser')) || null;
    var fbUser = firebaseAuth && firebaseAuth.currentUser;
    if (!user) {
        hideReservationMessage('limit');
        return;
    }
    hideReservationMessage('signin');
    if (!fbUser || !firestoreDb) {
        hideReservationMessage('limit');
        return;
    }
    var today = localDateString(new Date());
    getMyReservations(fbUser.uid).then(function(list) {
        var active = list.filter(function(r) { return !(r.date && r.date < today); });
        if (active.length >= MAX_TABLES_PER_ACCOUNT) {
            showReservationMessage(TABLE_LIMIT_MESSAGE, 'limit');
        } else {
            hideReservationMessage('limit');
        }
    }).catch(function(err) {
        console.warn('Could not check your reservations:', err && err.code);
    });
}

window.addEventListener('pageshow', function(e) { if (e.persisted) updateReservationLimitNotice(); });

// Reservation Form Handler
const reservationForm = document.getElementById('reservationForm');
var reservationSubmitting = false;

if (reservationForm) {
    reservationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (reservationSubmitting) return;

        // Reservations need a real (Firebase) account so the 2-tables-per-account limit can be enforced
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
        
        // Check if the selected date is locked
        if (isDateLocked(formData.date)) {
            alert('This date is no longer available for reservations. Reservations are locked at 7 PM on that day.');
            return;
        }
        
        // Check if time is before 7 PM (business hours start at 7 PM)
        const selectedTime = formData.time;
        if (selectedTime) {
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const timeInMinutes = hours * 60 + minutes;
            const businessStartTime = 19 * 60; // 7 PM = 19:00 = 1140 minutes
            
            if (timeInMinutes < businessStartTime) {
                alert('Error: Business hours start at 7:00 PM. Please select a time from 7:00 PM onwards.');
                return;
            }
        }

        if (!firestoreDb) {
            alert('Reservations are not available right now. Please refresh the page and try again.');
            return;
        }

    // Format the date for display (avoid timezone issues)
    const dateParts = formData.date.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
    const day = parseInt(dateParts[2]);
    const dateObj = new Date(year, month, day);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });

    const submitBtn = reservationForm.querySelector('button[type="submit"]');
    reservationSubmitting = true;
    if (submitBtn) submitBtn.disabled = true;

    // 1) past-dated reservations of this user are cancelled first (they no longer hold a table)
    // 2) at most 2 tables per account, 3) book table + lock + counter in one transaction
    cancelPastReservations(fbUser.uid).then(function(active) {
        if (active.length >= MAX_TABLES_PER_ACCOUNT) throw barError('bar/limit');
        return bookTableInFirestore(fbUser, formData);
    }).then(function(orderNumber) {
        onReservationBooked(formData, orderNumber, formattedDate);
    }).catch(function(err) {
        var code = err && err.code;
        if (code === 'bar/limit') {
            showReservationMessage(TABLE_LIMIT_MESSAGE, 'limit');
        } else if (code === 'bar/table-taken') {
            alert('This table is already reserved for this date. Table ' + formData.table + ' is locked with order number ' + err.orderNumber + '. Please select a different table.');
            updateSeatingChartForDate(formData.date, true);
            updateTableDropdownForDate(formData.date);
        } else if (code === 'permission-denied') {
            // The database refused the booking: most likely the per-account limit
            getMyReservations(fbUser.uid).then(function(list) {
                if (list.length >= MAX_TABLES_PER_ACCOUNT) {
                    showReservationMessage(TABLE_LIMIT_MESSAGE, 'limit');
                } else {
                    alert('Sorry, we could not save your reservation. Please refresh the page and try again.');
                }
            }).catch(function() {
                alert('Sorry, we could not save your reservation. Please refresh the page and try again.');
            });
        } else {
            console.warn('Reservation failed:', err);
            alert('Sorry, we could not save your reservation. Please check your connection and try again.');
        }
    }).then(function() {
        reservationSubmitting = false;
        if (submitBtn) submitBtn.disabled = false;
    });
});
}

// After the reservation is saved: same confirmation, email, seating chart update and success toast as before
function onReservationBooked(formData, orderNumber, formattedDate) {
    // Create confirmation message
    const confirmationMessage = `
Thank you for your reservation request, ${formData.name}!

Your reservation details:
- Order Number: ${orderNumber}
- Date: ${formattedDate}
- Time: ${formData.time}
- Guests: ${formData.guests}
- Table: ${formData.table}
- Email: ${formData.email}

Please save your order number: ${orderNumber}
You can use it to cancel your reservation if needed.

We'll contact you at ${formData.email} to confirm your reservation.

You can also place your reservation directly at +52 686 364 2083.
    `.trim();

    // Send order number to user's email
    sendOrderNumberEmail(formData.email, formData.name, orderNumber, formattedDate, formData.time, formData.table, formData.guests);

    // Show confirmation (in a real app, this would send to a server)
    alert(confirmationMessage);

    // Reset form
    reservationForm.reset();
    hideReservationMessage();
    checkLoginStatus(); // refill name/email and show the limit message if this was their 2nd table
    
    // Update seating chart and dropdown for the current date (if date input still has a value)
    const dateInput = document.getElementById('date');
    invalidateTableLocks(formData.date);
    if (dateInput.value) {
        updateSeatingChartForDate(dateInput.value);
        updateTableDropdownForDate(dateInput.value);
    } else {
        // Clear all X marks if no date selected
        const allSeats = document.querySelectorAll('.vip-seat, .seat-circle, .seat-square');
        allSeats.forEach(seat => {
            seat.classList.remove('reserved');
            const seatNumber = seat.dataset.tableNumber;
            if (seatNumber) {
                seat.innerHTML = seatNumber;
            }
        });
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
    successDiv.innerHTML = '✓ Reservation request submitted! We\'ll contact you to confirm.';
    document.body.appendChild(successDiv);

    // Remove success message after 5 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Initialize seat elements with data attributes for table numbers
function initializeSeatDataAttributes() {
    const allSeats = document.querySelectorAll('.vip-seat, .seat-circle, .seat-square');
    allSeats.forEach(seat => {
        const text = seat.textContent.trim();
        const seatNumber = parseInt(text);
        if (!isNaN(seatNumber)) {
            seat.dataset.tableNumber = seatNumber.toString();
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
    const option = document.createElement('option');
    option.value = i;
    if (i <= 4) {
        option.textContent = `VIP Table ${i}`;
    } else {
        option.textContent = `Table ${i}`;
    }
    if (tableSelect) tableSelect.appendChild(option);
}

// Update seating chart and dropdown when date changes
if (dateInput) dateInput.addEventListener('change', function() {
    const selectedDate = this.value;
    if (selectedDate) {
        // Check if date is locked
        if (isDateLocked(selectedDate)) {
            alert('This date is no longer available for reservations. Reservations are locked at 7 PM on that day.');
            this.value = '';
            return;
        }
        updateSeatingChartForDate(selectedDate);
        updateTableDropdownForDate(selectedDate);
    } else {
        // Clear all X marks if no date selected
        const allSeats = document.querySelectorAll('.vip-seat, .seat-circle, .seat-square');
        allSeats.forEach(seat => {
            seat.classList.remove('reserved');
            const seatNumber = seat.dataset.tableNumber;
            if (seatNumber) {
                seat.innerHTML = seatNumber;
            }
        });
        // Reset dropdown to show all tables
        tableSelect.innerHTML = '<option value="">Select a table...</option>';
        for (let i = 1; i <= 50; i++) {
            const option = document.createElement('option');
            option.value = i;
            if (i <= 4) {
                option.textContent = `VIP Table ${i}`;
            } else {
                option.textContent = `Table ${i}`;
            }
            tableSelect.appendChild(option);
        }
    }
});

// Set reasonable time limits (7 PM to 3 AM as default hours)
const timeInput = document.getElementById('time');
if (timeInput) {
    timeInput.setAttribute('min', '19:00');
    timeInput.setAttribute('max', '23:59'); // Note: Hours extend until 3 AM (next day)
    timeInput.setAttribute('title', 'Business hours: 7:00 PM - 3:00 AM');
}

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(0, 0, 0, 0.98)';
    } else {
        navbar.style.background = 'rgba(0, 0, 0, 0.95)';
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (!href || href === '#') return; // plain "#" links (e.g. Sign up / Login switch) have their own handlers
        const target = document.querySelector(href);
        if (target) {
            const offsetTop = target.offsetTop - 70; // Account for fixed navbar
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
            window.scrollTo({ top: target.offsetTop - 70, behavior: 'smooth' });
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
        window.scrollTo(0, Math.max(0, target.offsetTop - 70));
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
            window.scrollTo({ top: Math.max(0, target.offsetTop - 70), behavior: 'smooth' });
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
        promise = Promise.resolve({});
    } else {
        promise = firestoreDb.collection('barTableLocks').where('date', '==', date).get().then(function(snap) {
            var locked = {};
            snap.forEach(function(d) {
                var lock = d.data();
                locked[String(lock.table)] = { orderNumber: lock.orderNumber, time: lock.time || '' };
            });
            return locked;
        }).catch(function(err) {
            console.warn('Could not load taken tables:', err && err.code);
            delete tableLocksCache[date];
            return {};
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
            seat.innerHTML = `
                <span class="reserved-x">✕</span>
                ${reservationTime ? `<span class="reserved-time">${reservationTime}</span>` : ''}
            `;
            seat.title = `Locked with order number: ${lock.orderNumber}${reservationTime ? ` | Time: ${reservationTime}` : ''}`;
        } else {
            // Table is available - show number
            seat.classList.remove('reserved');
            seat.innerHTML = seatNumber.toString();
            seat.title = 'Available';
        }
    });
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
    tableSelect.innerHTML = '<option value="">Select a table...</option>';
    
    // Add all tables 1-50
    for (let i = 1; i <= 50; i++) {
        const tableKey = i.toString();
        // Only add if NOT taken for this date
        if (!reservedTables.hasOwnProperty(tableKey)) {
            const option = document.createElement('option');
            option.value = i;
            if (i <= 4) {
                option.textContent = `VIP Table ${i}`;
            } else {
                option.textContent = `Table ${i}`;
            }
            tableSelect.appendChild(option);
        }
    }
    
    // Restore previous selection if it's still available
    if (currentValue && !reservedTables.hasOwnProperty(currentValue)) {
        tableSelect.value = currentValue;
    }
}

// Cancellation flow: handled by the inline script in cancel.html (single source of truth).

// Function to send order number via email
function sendOrderNumberEmail(email, name, orderNumber, date, time, table, guests) {
    console.log('📧 Attempting to send email to:', email);
    
    // Check if email is enabled
    if (typeof EMAIL_CONFIG === 'undefined' || !EMAIL_CONFIG.enabled) {
        console.log('📧 Email sending is disabled.');
        return;
    }
    
    // Check if EmailJS is loaded
    if (typeof emailjs === 'undefined') {
        console.warn('❌ EmailJS library not loaded. Check if script is included in HTML.');
        return;
    }
    
    // Check if EmailJS is properly configured
    if (EMAIL_CONFIG.publicKey === 'YOUR_PUBLIC_KEY' || 
        EMAIL_CONFIG.serviceID === 'YOUR_SERVICE_ID' || 
        EMAIL_CONFIG.templateID === 'YOUR_TEMPLATE_ID') {
        console.log('📧 Email would be sent to:', email);
        console.log('📧 Order Number:', orderNumber);
        console.log('📧 Reservation Details:', {
            name: name,
            date: date,
            time: time,
            table: table <= 4 ? `VIP Table ${table}` : `Table ${table}`,
            guests: guests
        });
        console.log('⚠️ EmailJS not configured yet.');
        console.log('📝 To enable email sending:');
        console.log('   1. Sign up at https://www.emailjs.com/');
        console.log('   2. Create service and template');
        console.log('   3. Update email-config.js with your credentials');
        return;
    }
    
    // Ensure EmailJS is initialized
    if (EMAIL_CONFIG.publicKey) {
        emailjs.init(EMAIL_CONFIG.publicKey);
    }
    
    // Email template parameters
    const templateParams = {
        to_email: email,
        to_name: name,
        order_number: orderNumber,
        reservation_date: date,
        reservation_time: time,
        table_number: table <= 4 ? `VIP Table ${table}` : `Table ${table}`,
        number_of_guests: guests,
        from_name: 'Bar Chinesca Mxli'
    };
    
    console.log('📧 Sending email with params:', templateParams);
    
    // Send email
    emailjs.send(EMAIL_CONFIG.serviceID, EMAIL_CONFIG.templateID, templateParams)
        .then(function(response) {
            console.log('✅ Email sent successfully!', response.status, response.text);
            console.log('📧 Order number', orderNumber, 'sent to', email);
        }, function(error) {
            console.error('❌ Email failed to send:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));
            // Don't show error to user - reservation is still saved
        });
}

// Test function to send email (for testing purposes)
window.testSendEmail = function(testEmail) {
    if (!testEmail) {
        testEmail = prompt('Enter your email address for testing:');
        if (!testEmail) return;
    }
    
    const testOrderNumber = '123456';
    const testName = 'Test User';
    const testDate = 'Monday, January 28, 2026';
    const testTime = '20:00';
    const testTable = 5;
    const testGuests = 2;
    
    console.log('🧪 Testing email to:', testEmail);
    sendOrderNumberEmail(testEmail, testName, testOrderNumber, testDate, testTime, testTable, testGuests);
};

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

// Firebase Auth (Google + Email/Password). Config lives in firebase-config.js.
// Google sign-in uses Firebase's popup flow (no separate OAuth client ID needed).
var firebaseApp = null;
var firebaseAuth = null;
var accountSetupInProgress = false;

function isLoginPage() {
    return /(^|\/)login(\.html)?$/.test(window.location.pathname || '');
}

// Build the site's currentUser object from a Firebase user (name, email, photo)
function saveFirebaseUser(user) {
    if (!user) return null;
    var googleProfile = (user.providerData || []).filter(function(p) { return p && p.providerId === 'google.com'; })[0] || null;
    var displayName = (user.displayName || (googleProfile && googleProfile.displayName) || '').trim();
    var email = user.email || (googleProfile && googleProfile.email) || '';
    var parts = displayName.split(/\s+/).filter(Boolean);
    currentUser = {
        firstName: parts[0] || (email ? email.split('@')[0] : '') || 'User',
        lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
        displayName: displayName,
        email: email,
        photoURL: user.photoURL || (googleProfile && googleProfile.photoURL) || '',
        uid: user.uid,
        isGoogle: !!googleProfile,
        createdAt: (user.metadata && user.metadata.creationTime) || new Date().toISOString()
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    return currentUser;
}

// Called after a successful Google sign-in (popup or redirect)
function onGoogleSignedIn(user) {
    var u = saveFirebaseUser(user);
    if (!u) return;
    if (isLoginPage()) {
        window.location.href = '/profile';
        return;
    }
    if (typeof closeAuthModal === 'function') closeAuthModal();
    checkLoginStatus();
    alert('Signed in with Google! Welcome, ' + u.firstName + '!');
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
    try { firebaseAuth.useDeviceLanguage(); } catch (e) {}
    // Reservations database (pages that load firebase-firestore-compat.js)
    if (firebase.firestore) {
        try { firestoreDb = firebase.firestore(); } catch (e) { firestoreDb = null; }
    }

    // Finish a redirect sign-in (only used when the popup was blocked)
    firebaseAuth.getRedirectResult().then(function(result) {
        if (result && result.user) onGoogleSignedIn(result.user);
    }).catch(function(err) {
        if (err && err.code) showGoogleSignInError(err);
    });

    firebaseAuth.onAuthStateChanged(function(user) {
        if (user) {
            saveFirebaseUser(user);
            checkLoginStatus();
            // (sign-up / account migration redirect themselves once the name is saved)
            if (isLoginPage() && !accountSetupInProgress) {
                window.location.href = '/profile';
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

function showGoogleSignInError(err) {
    var code = (err && err.code) || '';
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' ||
        code === 'auth/user-cancelled') {
        return; // user just closed the Google window
    }
    console.error('Google sign-in error:', err);
    var msg;
    if (code === 'auth/unauthorized-domain') {
        msg = 'Google sign-in is not allowed on this website address yet (' + window.location.hostname +
            '). Add it in Firebase Console > Authentication > Settings > Authorized domains.';
    } else if (code === 'auth/operation-not-allowed') {
        msg = 'Google sign-in is turned off for this site. Enable Google in Firebase Console > Authentication > Sign-in method.';
    } else if (code === 'auth/account-exists-with-different-credential') {
        msg = 'An account with this email already exists. Please log in with your email and password.';
    } else if (code === 'auth/network-request-failed') {
        msg = 'Network error. Check your connection and try again.';
    } else {
        msg = 'Google sign-in failed. ' + ((err && err.message) || 'Please try again.');
    }
    alert(msg);
}

// Sign in with Google: popup first (works on desktop and mobile), redirect if the popup is blocked
function signInWithGoogle() {
    if (!firebaseAuth || typeof firebase === 'undefined') {
        alert('Google sign-in is not available right now. Please refresh the page and try again.');
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

// Wire up the "Continue with Google" buttons (login + signup views)
window.initGoogleSignIn = function() {
    var buttons = document.querySelectorAll('.js-google-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].onclick = function(e) {
            if (e) e.preventDefault();
            signInWithGoogle();
        };
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
                    showLoginPageMessage('Login successful. Redirecting…');
                    window.location.href = '/profile';
                    return;
                }
                closeAuthModal();
                checkLoginStatus();
                alert('Login successful! Welcome back.');
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
                if (err.code === 'auth/user-not-found') alert('No account with this email. Please sign up first.');
                else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' ||
                    err.code === 'auth/invalid-login-credentials') alert('Incorrect email or password. Please try again.');
                else if (err.code === 'auth/invalid-email') alert('Invalid email address.');
                else alert(err.message || 'Login failed. Please try again.');
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
                showLoginPageMessage('Login successful. Redirecting…');
                window.location.href = '/profile';
                return;
            }
            closeAuthModal();
            checkLoginStatus();
            alert('Login successful! Welcome back, ' + currentUser.firstName + '!');
        } else {
            alert('Incorrect password. Please try again.');
        }
    } else {
        alert('Account not found. Please create an account first.');
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
                showLoginPageMessage('Login successful. Redirecting…');
                window.location.href = '/profile';
                return;
            }
            closeAuthModal();
            checkLoginStatus();
            alert('Login successful! Welcome back.');
        })
        .catch(function(err) {
            accountSetupInProgress = false;
            if (err.code === 'auth/email-already-in-use') alert('Incorrect email or password. Please try again.');
            else alert(err.message || 'Login failed. Please try again.');
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
        alert('An account with this email already exists. Please login instead.');
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
        showLoginPageMessage('Account created. Redirecting…');
        window.location.href = '/profile';
        return true;
    }
    closeAuthModal();
    checkLoginStatus();
    alert('Account created.');
    return true;
}

// Signup: first name, last name, email, password only. Account created and you're logged in (no code, no verification).
function handleSignup(firstName, lastName, email, password) {
    if (password.length < 6) {
        alert('Password must be at least 6 characters long.');
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
                    showLoginPageMessage('Account created. Redirecting…');
                    window.location.href = '/profile';
                    return;
                }
                closeAuthModal();
                checkLoginStatus();
                alert('Account created.');
            })
            .catch(function(err) {
                accountSetupInProgress = false;
                if (err.code === 'auth/email-already-in-use') {
                    alert('An account with this email already exists. Please login instead.');
                    return;
                }
                if (err.code === 'auth/weak-password') {
                    alert('Password is too weak. Use at least 6 characters.');
                    return;
                }
                if (err.code === 'auth/invalid-email') {
                    alert('Invalid email address.');
                    return;
                }
                // Accounts must be real Firebase accounts (reservations are tied to them)
                if (err.code === 'auth/network-request-failed') {
                    alert('Network error. Check your connection and try again.');
                    return;
                }
                alert((err && err.message) || 'Could not create your account. Please try again.');
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
