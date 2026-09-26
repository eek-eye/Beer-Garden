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

// Reservation Form Handler
const reservationForm = document.getElementById('reservationForm');

if (reservationForm) {
    reservationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Check if user is logged in
        currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        
        if (!currentUser) {
            // Show popup when they try to submit without being logged in
            alert('You must be logged in to request service. Let\'s create an account!');
            if (typeof showAuthModal === 'function') {
                showAuthModal('signup'); // Show signup form first to encourage account creation
            }
            return;
        }

        // Get form data (use logged in user's info to ensure consistency)
        const formData = {
            name: currentUser.firstName + ' ' + currentUser.lastName,
            email: currentUser.email,
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

    // Check if table is already reserved for this date
    reservations = JSON.parse(localStorage.getItem('reservations')) || {};
    const selectedDate = formData.date;
    const selectedTable = formData.table.toString();
    
    // Verify table is available (not already locked with an order number)
    if (reservations[selectedDate] && reservations[selectedDate][selectedTable]) {
        const existingOrderNumber = reservations[selectedDate][selectedTable];
        alert('This table is already reserved for this date. Table ' + selectedTable + ' is locked with order number ' + existingOrderNumber + '. Please select a different table.');
        return;
    }
    
    // Generate order number (already returns as string)
    const orderNumber = generateOrderNumber();
    
    // Ensure order number is stored as string
    const orderKey = orderNumber.toString();
    
    // Store order details - always use string key
    orderDetails[orderKey] = {
        name: formData.name,
        email: formData.email,
        date: formData.date,
        time: formData.time,
        guests: formData.guests,
        table: parseInt(formData.table)
    };
    localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
    
    // Debug: Log saved order
    console.log('Order saved with key:', orderKey, 'Type:', typeof orderKey);
    console.log('Order details:', orderDetails[orderKey]);
    console.log('All order keys in storage:', Object.keys(orderDetails));
    console.log('Key types:', Object.keys(orderDetails).map(k => typeof k));

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

You can also place your reservation directly at (123) 456-7890.
    `.trim();

    // Send order number to user's email
    sendOrderNumberEmail(formData.email, formData.name, orderNumber, formattedDate, formData.time, formData.table, formData.guests);

    // Show confirmation (in a real app, this would send to a server)
    alert(confirmationMessage);

    // Mark the selected table as reserved with red X for the selected date
    markTableAsReserved(formData.table, formData.date, orderNumber);

    // Reset form
    reservationForm.reset();
    
    // Update seating chart and dropdown for the current date (if date input still has a value)
    const dateInput = document.getElementById('date');
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
});
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
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const offsetTop = target.offsetTop - 70; // Account for fixed navbar
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    });
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

// Function to mark a table as reserved with red X for a specific date
// The order number is PERMANENTLY locked to this specific table+date combination
// This lock persists across page refreshes until the reservation is cancelled
function markTableAsReserved(tableNumber, date, orderNumber) {
    // Reload from localStorage to ensure we have latest data
    reservations = JSON.parse(localStorage.getItem('reservations')) || {};
    orderDetails = JSON.parse(localStorage.getItem('orderDetails')) || {};
    
    // Store reservation by date with order number
    // This PERMANENTLY locks the order number to the table for this specific date
    if (!reservations[date]) {
        reservations[date] = {};
    }
    
    // Ensure table number is string for consistency
    const tableKey = tableNumber.toString();
    const orderKey = orderNumber.toString();
    
    // Check if table is already reserved (shouldn't happen due to check above, but double-check)
    if (reservations[date][tableKey]) {
        const existingOrder = reservations[date][tableKey];
        console.error('ERROR: Table', tableKey, 'for date', date, 'is already locked with order number', existingOrder);
        console.error('Attempted to lock with new order number:', orderKey);
        alert('Error: This table is already reserved. Please refresh the page and try again.');
        return;
    }
    
    // PERMANENTLY lock the order number to this table+date combination
    reservations[date][tableKey] = orderKey;
    
    // Ensure order details exist
    if (!orderDetails[orderKey]) {
        console.error('ERROR: Order details not found for order number:', orderKey);
        alert('Error: Order details not found. Please try making the reservation again.');
        return;
    }
    
    // Save to localStorage - this persists across page refreshes
    localStorage.setItem('reservations', JSON.stringify(reservations));
    localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
    
    console.log('✅ PERMANENT LOCK CREATED:');
    console.log('  Table:', tableKey, 'for date:', date);
    console.log('  Locked with order number:', orderKey);
    console.log('  This lock will persist until cancellation');
    
    // Update the seating chart and dropdown for the current date
    updateSeatingChartForDate(date);
    updateTableDropdownForDate(date);
}

// Function to update seating chart based on selected date
// Shows X on tables that are locked with an order number
function updateSeatingChartForDate(date) {
    // Reload from localStorage to ensure we have latest data
    reservations = JSON.parse(localStorage.getItem('reservations')) || {};
    
    const allSeats = document.querySelectorAll('.vip-seat, .seat-circle, .seat-square');
    const reservedTables = reservations[date] || {};
    
    console.log('Updating seating chart for date:', date);
    console.log('Locked tables:', reservedTables);
    
    allSeats.forEach(seat => {
        // Get the seat number from the original content or data attribute
        let seatNumber;
        
        // Check if seat has a data attribute with the number
        if (seat.dataset.tableNumber) {
            seatNumber = parseInt(seat.dataset.tableNumber);
        } else {
            // Try to get from text content (might be a number or X)
            const text = seat.textContent.trim();
            // If it's just a number, use it; otherwise check parent or siblings
            if (!isNaN(parseInt(text)) && text !== '✕') {
                seatNumber = parseInt(text);
                // Store it for future reference
                seat.dataset.tableNumber = seatNumber.toString();
            } else {
                // Try to find the number from nearby elements or use the seat's position
                // For now, we'll need to store the original number when we first see it
                return; // Skip if we can't determine the number
            }
        }
        
        const tableKey = seatNumber.toString();
        const isReserved = reservedTables.hasOwnProperty(tableKey);
        
        if (isReserved) {
            // Table is LOCKED with an order number - show X and time
            const lockedOrderNumber = reservedTables[tableKey];
            seat.classList.add('reserved');
            
            // Get reservation time from order details
            const orderDetails = JSON.parse(localStorage.getItem('orderDetails')) || {};
            const orderInfo = orderDetails[lockedOrderNumber];
            const reservationTime = orderInfo ? orderInfo.time : '';
            
            // Display X with time underneath
            seat.innerHTML = `
                <span class="reserved-x">✕</span>
                ${reservationTime ? `<span class="reserved-time">${reservationTime}</span>` : ''}
            `;
            seat.title = `Locked with order number: ${lockedOrderNumber}${reservationTime ? ` | Time: ${reservationTime}` : ''}`;
            console.log('Table', seatNumber, 'is LOCKED with order number', lockedOrderNumber, 'Time:', reservationTime);
        } else {
            // Table is available - show number
            seat.classList.remove('reserved');
            seat.innerHTML = seatNumber.toString();
            seat.title = 'Available';
        }
    });
}

// Function to update table dropdown based on selected date
// Only shows tables that are NOT locked with an order number
function updateTableDropdownForDate(date) {
    // Reload from localStorage to ensure we have latest data
    reservations = JSON.parse(localStorage.getItem('reservations')) || {};
    
    const tableSelect = document.getElementById('table');
    const reservedTables = reservations[date] || {};
    const currentValue = tableSelect.value;
    
    // Clear existing options except the first "Select a table..." option
    tableSelect.innerHTML = '<option value="">Select a table...</option>';
    
    // Add all tables 1-50
    for (let i = 1; i <= 50; i++) {
        const tableKey = i.toString();
        // Only add if NOT locked with an order number for this date
        if (!reservedTables.hasOwnProperty(tableKey)) {
            const option = document.createElement('option');
            option.value = i;
            if (i <= 4) {
                option.textContent = `VIP Table ${i}`;
            } else {
                option.textContent = `Table ${i}`;
            }
            tableSelect.appendChild(option);
        } else {
            // Table is locked - log it for debugging
            const lockedOrderNumber = reservedTables[tableKey];
            console.log('Table', i, 'is LOCKED with order number', lockedOrderNumber, 'for date', date);
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
        window.location.href = 'profile.html';
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
            if (isLoginPage()) {
                window.location.href = 'profile.html';
            }
        } else {
            // Only clear a session that came from Firebase (keep local-only accounts)
            var stored = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (stored && stored.uid) {
                currentUser = null;
                localStorage.removeItem('currentUser');
                checkLoginStatus();
            }
        }
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
function signOutUser(callback) {
    var done = function() {
        currentUser = null;
        localStorage.removeItem('currentUser');
        if (typeof callback === 'function') callback();
    };
    if (firebaseAuth) {
        firebaseAuth.signOut().then(done, done);
    } else {
        done();
    }
}
window.signOutUser = signOutUser;

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
                    window.location.href = 'profile.html';
                    return;
                }
                closeAuthModal();
                checkLoginStatus();
                alert('Login successful! Welcome back.');
            })
            .catch(function(err) {
                if (err.code === 'auth/user-not-found') alert('No account with this email. Please sign up first.');
                else if (err.code === 'auth/wrong-password') alert('Incorrect password. Please try again.');
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
                window.location.href = 'profile.html';
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
        window.location.href = 'profile.html';
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
        firebaseAuth.createUserWithEmailAndPassword(email, password)
            .then(function(cred) {
                return cred.user.updateProfile({ displayName: (firstName + ' ' + lastName).trim() });
            })
            .then(function() {
                if (!document.getElementById('authModal')) {
                    showLoginPageMessage('Account created. Redirecting…');
                    window.location.href = 'profile.html';
                    return;
                }
                closeAuthModal();
                checkLoginStatus();
                alert('Account created.');
            })
            .catch(function(err) {
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
                // Firebase failed (e.g. not configured, wrong domain, network) — create account with your data and log you in anyway
                createAccountAndLogIn(firstName, lastName, email, password);
            });
        return;
    }
    createAccountAndLogIn(firstName, lastName, email, password);
}

// Initialize auth system when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
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
    
    // Login form submit
    if (loginFormElement) {
        loginFormElement.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            if (email && password) {
                handleLogin(email, password);
            }
        });
    }
    
    // Signup form submit
    if (signupFormElement) {
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
