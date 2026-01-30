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

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
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
dateInput.setAttribute('min', todayStr);

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
    tableSelect.appendChild(option);
}

// Update seating chart and dropdown when date changes
dateInput.addEventListener('change', function() {
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

// Cancellation Form Handler - Global variables for cancellation flow
let currentOrderNumber = null;
let currentOrder = null;

// Step 1: Check order number - Make sure it's globally accessible
window.checkOrderNumber = function(e) {
    // Prevent form submission and page refresh
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    console.log('checkOrderNumber called');
    
    try {
        const orderNumberInput = document.getElementById('orderNumber');
        if (!orderNumberInput) {
            alert('Order number input not found. Please refresh the page.');
            console.error('Order number input not found');
            return false;
        }
        
        let orderNumber = orderNumberInput.value.trim();
        console.log('Order number entered (raw):', orderNumber, 'Type:', typeof orderNumber);
        
        if (!orderNumber) {
            alert('Please enter your order number.');
            return false;
        }
        
        // Ensure it's a string and remove any non-numeric characters
        orderNumber = orderNumber.replace(/\D/g, '');
        if (orderNumber.length !== 6) {
            alert('Order number must be exactly 6 digits. Please check and try again.');
            return false;
        }
        
        console.log('Order number cleaned:', orderNumber);
        
        // Reload orderDetails from localStorage to ensure we have the latest data
        const storedOrders = localStorage.getItem('orderDetails');
        console.log('Raw stored orders from localStorage:', storedOrders);
        
        orderDetails = storedOrders ? JSON.parse(storedOrders) : {};
        console.log('Order details loaded:', orderDetails);
        console.log('Number of orders:', Object.keys(orderDetails).length);
        console.log('All order number keys:', Object.keys(orderDetails));
        console.log('Order number types in storage:', Object.keys(orderDetails).map(k => typeof k));
        
        // Try to find the order - check both as string and as number
        let foundOrder = orderDetails[orderNumber];
        
        // If not found as string, try as number (in case it was stored differently)
        if (!foundOrder) {
            const numOrderNumber = parseInt(orderNumber);
            foundOrder = orderDetails[numOrderNumber];
            if (foundOrder) {
                console.log('Found order using number key:', numOrderNumber);
                orderNumber = numOrderNumber.toString(); // Use the number key format
            }
        }
        
        // Check if order exists
        if (!foundOrder) {
            console.log('Order not found. Available orders:', Object.keys(orderDetails));
            alert('Unexistent Order number');
            return false;
        }
        
        console.log('Order found!', foundOrder);
        
        // Verify the order is properly linked to a table in reservations
        // Reload reservations to ensure we have latest data
        reservations = JSON.parse(localStorage.getItem('reservations')) || {};
        const orderDate = foundOrder.date;
        const orderTable = foundOrder.table.toString();
        
        console.log('Checking reservation link for date:', orderDate, 'table:', orderTable);
        console.log('Reservations for this date:', reservations[orderDate]);
        
        // Check if the order number matches what's stored in reservations
        if (reservations[orderDate] && reservations[orderDate][orderTable]) {
            const linkedOrderNumber = reservations[orderDate][orderTable];
            console.log('Table is linked to order number:', linkedOrderNumber);
            
            // Verify the order numbers match
            if (linkedOrderNumber.toString() !== orderNumber.toString()) {
                console.warn('Order number mismatch! Order details say:', orderNumber, 'but reservations say:', linkedOrderNumber);
                // Try to use the linked order number instead
                if (orderDetails[linkedOrderNumber]) {
                    console.log('Using linked order number instead');
                    currentOrderNumber = linkedOrderNumber.toString();
                    currentOrder = orderDetails[linkedOrderNumber];
                } else {
                    alert('Order number found but not properly linked to a table. Please contact support.');
                    return false;
                }
            } else {
                currentOrderNumber = orderNumber;
                currentOrder = foundOrder;
            }
        } else {
            console.warn('Order found in orderDetails but not properly linked in reservations!');
            console.log('Attempting to fix the link...');
            
            // Try to fix the link
            if (!reservations[orderDate]) {
                reservations[orderDate] = {};
            }
            reservations[orderDate][orderTable] = orderNumber;
            localStorage.setItem('reservations', JSON.stringify(reservations));
            console.log('Fixed the link!');
            
            currentOrderNumber = orderNumber;
            currentOrder = foundOrder;
        }
        
        console.log('Current order number:', currentOrderNumber);
        console.log('Current order:', currentOrder);
        
        // Show step 2 (table confirmation)
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        
        if (!step1) {
            alert('Step 1 element not found. Please refresh the page.');
            console.error('Step 1 element not found');
            return false;
        }
        
        if (!step2) {
            alert('Step 2 element not found. Please refresh the page.');
            console.error('Step 2 element not found');
            return false;
        }
        
        // All steps are now visible, just update the table display
        console.log('Step 2 displayed');
        
        // Display table number
        const tableDisplay = document.getElementById('tableNumberDisplay');
        if (!tableDisplay) {
            alert('Table display element not found. Please refresh the page.');
            console.error('Table number display not found');
            return false;
        }
        
        const tableNumber = currentOrder.table;
        if (tableNumber <= 4) {
            tableDisplay.textContent = `VIP Table ${tableNumber}`;
        } else {
            tableDisplay.textContent = `Table ${tableNumber}`;
        }
        console.log('Table number displayed:', tableNumber);
        
        return false; // Prevent form submission
    } catch (error) {
        console.error('Error in checkOrderNumber:', error);
        alert('An error occurred: ' + error.message + '. Please try again.');
        return false;
    }
}

// Go back to step 1
function goBackToStep1() {
    try {
        // Reset the table display
        const tableDisplay = document.getElementById('tableNumberDisplay');
        if (tableDisplay) {
            tableDisplay.textContent = '-';
        }
        // Clear the order number input
        const orderNumberInput = document.getElementById('orderNumber');
        if (orderNumberInput) {
            orderNumberInput.value = '';
        }
        currentOrderNumber = null;
        currentOrder = null;
    } catch (error) {
        console.error('Error in goBackToStep1:', error);
    }
}

// Step 2: Confirm table
function confirmTable() {
    try {
        // All steps are visible, no need to show/hide
        console.log('Table confirmed, ready for cancellation reason');
    } catch (error) {
        console.error('Error in confirmTable:', error);
    }
}

// Add event listeners for cancellation buttons
// Since script is at end of body, DOM is already ready
(function() {
    const continueBtn = document.getElementById('continueBtn');
    const goBackBtn = document.getElementById('goBackBtn');
    const confirmTableBtn = document.getElementById('confirmTableBtn');
    
    if (continueBtn) {
        continueBtn.addEventListener('click', function(e) {
            e.preventDefault();
            checkOrderNumber();
        });
    }
    
    if (goBackBtn) {
        goBackBtn.addEventListener('click', function(e) {
            e.preventDefault();
            goBackToStep1();
        });
    }
    
    if (confirmTableBtn) {
        confirmTableBtn.addEventListener('click', function(e) {
            e.preventDefault();
            confirmTable();
        });
    }
})();

// Step 3: Submit cancellation
window.submitCancellation = function() {
    try {
        if (!currentOrderNumber || !currentOrder) {
            alert('Please start from the beginning.');
            return;
        }
        
        const cancellationReasonSelect = document.getElementById('cancellationReason');
        if (!cancellationReasonSelect) {
            alert('Cancellation reason select not found. Please refresh the page.');
            return;
        }
        
        const cancellationReason = cancellationReasonSelect.value.trim();
        
        if (!cancellationReason) {
            alert('Please select a reason for cancellation.');
            return;
        }
        
        const orderDate = currentOrder.date;
        const tableNumber = currentOrder.table.toString();
        
        // Remove reservation - this frees the table for the next customer
        if (reservations[orderDate] && reservations[orderDate][tableNumber]) {
            const lockedOrderNumber = reservations[orderDate][tableNumber];
            console.log('Cancelling reservation: Table', tableNumber, 'for date', orderDate, 'was locked with order number', lockedOrderNumber);
            
            delete reservations[orderDate][tableNumber];
            
            // If no more reservations for this date, remove the date entry
            if (Object.keys(reservations[orderDate]).length === 0) {
                delete reservations[orderDate];
            }
            
            localStorage.setItem('reservations', JSON.stringify(reservations));
            console.log('Table', tableNumber, 'is now free for date', orderDate, '- next customer will get a new order number');
        }
        
        // Remove order details - the order number is no longer valid
        delete orderDetails[currentOrderNumber];
        localStorage.setItem('orderDetails', JSON.stringify(orderDetails));
        console.log('Order number', currentOrderNumber, 'has been removed. Table is available for new reservation.');
        
        // Update seating chart and dropdown if the date is currently selected (on main page)
        const dateInput = document.getElementById('date');
        if (dateInput && dateInput.value === orderDate) {
            updateSeatingChartForDate(orderDate);
            updateTableDropdownForDate(orderDate);
        }
        
        // Hide all form steps and show thank you message
        const step1 = document.getElementById('step1');
        const step2 = document.getElementById('step2');
        const step3 = document.getElementById('step3');
        const thankYouMessage = document.getElementById('thankYouMessage');
        
        if (step1) step1.style.display = 'none';
        if (step2) step2.style.display = 'none';
        if (step3) step3.style.display = 'none';
        if (thankYouMessage) thankYouMessage.style.display = 'block';
        
        // Reset variables
        currentOrderNumber = null;
        currentOrder = null;
    } catch (error) {
        console.error('Error in submitCancellation:', error);
        alert('An error occurred: ' + error.message + '. Please try again.');
    }
};

// Also add event listener as backup
const cancellationForm = document.getElementById('cancellationForm');
if (cancellationForm) {
    cancellationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        submitCancellation();
    });
}

// Add event listener for submit button
const submitCancellationBtn = document.getElementById('submitCancellationBtn');
if (submitCancellationBtn) {
    submitCancellationBtn.addEventListener('click', function(e) {
        e.preventDefault();
        submitCancellation();
    });
}

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

// Firebase Auth (when firebase-config.js is filled: Google + Email/Password)
var firebaseApp = null;
var firebaseAuth = null;

function initFirebaseAuth() {
    if (typeof FIREBASE_CONFIG === 'undefined' || !FIREBASE_CONFIG.enabled ||
        !FIREBASE_CONFIG.apiKey || FIREBASE_CONFIG.apiKey.indexOf('YOUR_') === 0) {
        return;
    }
    if (typeof firebase === 'undefined') return;
    try {
        firebaseApp = firebase.app();
    } catch (e) {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    }
    firebaseAuth = firebase.auth();
    firebaseAuth.onAuthStateChanged(function(user) {
        if (user) {
            var displayName = (user.displayName || user.email || '').trim();
            var parts = displayName.split(/\s+/).filter(Boolean);
            currentUser = {
                firstName: parts[0] || (user.email ? user.email.split('@')[0] : '') || 'User',
                lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
                email: user.email,
                uid: user.uid,
                isGoogle: user.providerData && user.providerData.some(function(p) { return p.providerId === 'google.com'; }),
                createdAt: user.metadata.creationTime || new Date().toISOString()
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            checkLoginStatus();
            if (typeof window.location !== 'undefined' && window.location.pathname.replace(/^.*[/\\]/, '') === 'login.html') {
                window.location.href = 'index.html';
                return;
            }
        } else {
            currentUser = null;
            localStorage.removeItem('currentUser');
        }
    });
}

initFirebaseAuth();

// Decode JWT payload (base64url) from Google credential
function decodeGoogleJwtPayload(credential) {
    try {
        const parts = credential.split('.');
        if (parts.length !== 3) return null;
        const payload = parts[1];
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(json);
    } catch (e) {
        console.error('Error decoding Google JWT:', e);
        return null;
    }
}

// Handle Google Sign-In credential (firewall: access with Google account)
function handleGoogleCredential(response) {
    if (!response || !response.credential) {
        console.error('Google Sign-In: no credential in response');
        return;
    }
    const payload = decodeGoogleJwtPayload(response.credential);
    if (!payload || !payload.email) {
        alert('Could not get your Google account info. Please try again.');
        return;
    }
    const fullName = (payload.name || payload.email || '').trim();
    const nameParts = fullName.split(/\s+/);
    const firstName = payload.given_name || nameParts[0] || 'User';
    const lastName = payload.family_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
    const email = payload.email;

    userAccounts = JSON.parse(localStorage.getItem('userAccounts')) || {};
    if (!userAccounts[email]) {
        userAccounts[email] = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            isGoogle: true,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem('userAccounts', JSON.stringify(userAccounts));
    }

    currentUser = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        isGoogle: true,
        createdAt: userAccounts[email].createdAt || new Date().toISOString()
    };
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    if (!document.getElementById('authModal')) {
        window.location.href = 'index.html';
        return;
    }
    closeAuthModal();
    checkLoginStatus();
    alert('Signed in with Google! Welcome, ' + firstName + '!');
}

// Initialize Google Sign-In: Firebase (Google + Email/Password) or standalone Google Identity
window.initGoogleSignIn = function() {
    var loginContainer = document.getElementById('googleSignInButton');
    var signupContainer = document.getElementById('googleSignUpButton');
    if (!loginContainer || !signupContainer) return;

    var attachGoogleClick = function(container) {
        var btn = container && container.querySelector('.js-google-btn');
        if (!btn) return;
        if (firebaseAuth && typeof firebase !== 'undefined') {
            var provider = new firebase.auth.GoogleAuthProvider();
            btn.onclick = function() {
                firebaseAuth.signInWithPopup(provider)
                    .then(function() {
                        if (!document.getElementById('authModal')) {
                            window.location.href = 'index.html';
                            return;
                        }
                        closeAuthModal();
                        checkLoginStatus();
                        alert('Signed in with Google! Welcome.');
                    })
                    .catch(function(err) {
                        if (err.code === 'auth/popup-closed-by-user') return;
                        alert(err.message || 'Google sign-in failed. Please try again.');
                    });
            };
            return;
        }
        btn.onclick = function() {
            alert('Google sign-in is not configured. Add your Firebase or Google Client ID in firebase-config.js or google-auth-config.js.');
        };
    };

    // When Firebase Auth is configured, attach click to the existing "Continue with Google" button
    if (firebaseAuth && typeof firebase !== 'undefined') {
        attachGoogleClick(loginContainer);
        attachGoogleClick(signupContainer);
        return;
    }

    // Fallback: standalone Google Identity Services – replace container content with Google's button
    var gsiConfigured = typeof GOOGLE_AUTH_CONFIG !== 'undefined' && GOOGLE_AUTH_CONFIG.enabled &&
        GOOGLE_AUTH_CONFIG.clientId && GOOGLE_AUTH_CONFIG.clientId.indexOf('YOUR_GOOGLE') !== 0;
    if (gsiConfigured && typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.initialize({
            client_id: GOOGLE_AUTH_CONFIG.clientId,
            callback: handleGoogleCredential,
            auto_select: false
        });
        loginContainer.innerHTML = '';
        signupContainer.innerHTML = '';
        google.accounts.id.renderButton(loginContainer, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            width: 320
        });
        google.accounts.id.renderButton(signupContainer, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: 'continue_with',
            width: 320
        });
        return;
    }
    if (gsiConfigured && (typeof google === 'undefined' || !google.accounts || !google.accounts.id)) {
        setTimeout(initGoogleSignIn, 100);
        return;
    }

    // No Firebase and no GSI: attach fallback so the HTML button is always pressable
    attachGoogleClick(loginContainer);
    attachGoogleClick(signupContainer);
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
                    window.location.href = 'index.html';
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
                window.location.href = 'index.html';
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

// Signup Function (Firebase Email/Password or fallback to localStorage)
function handleSignup(firstName, lastName, email, password) {
    if (password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    if (firebaseAuth) {
        firebaseAuth.createUserWithEmailAndPassword(email, password)
            .then(function(cred) {
                return cred.user.updateProfile({ displayName: (firstName + ' ' + lastName).trim() });
            })
            .then(function() {
                if (!document.getElementById('authModal')) {
                    window.location.href = 'index.html';
                    return;
                }
                closeAuthModal();
                checkLoginStatus();
                alert('Account created successfully! Welcome, ' + firstName + '!');
            })
            .catch(function(err) {
                if (err.code === 'auth/email-already-in-use') alert('An account with this email already exists. Please login instead.');
                else if (err.code === 'auth/weak-password') alert('Password is too weak. Use at least 6 characters.');
                else if (err.code === 'auth/invalid-email') alert('Invalid email address.');
                else alert(err.message || 'Sign up failed. Please try again.');
            });
        return;
    }
    userAccounts = JSON.parse(localStorage.getItem('userAccounts')) || {};
    if (userAccounts[email]) {
        alert('An account with this email already exists. Please login instead.');
        return;
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
        window.location.href = 'index.html';
        return;
    }
    closeAuthModal();
    checkLoginStatus();
    alert('Account created successfully! Welcome, ' + firstName + '!');
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

// Update reservation form to require login
const originalReservationSubmit = reservationForm ? reservationForm.addEventListener : null;

if (reservationForm) {
    reservationForm.addEventListener('submit', (e) => {
        // Check if user is logged in
        currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        
        if (!currentUser) {
            e.preventDefault();
            alert('Please login or create an account to make a reservation.');
            showAuthModal('login');
            return;
        }
        
        // Continue with existing form submission logic...
        // The rest of the form handler code will continue below
    });
}
