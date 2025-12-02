document.addEventListener('DOMContentLoaded', () => {
    loadTheme(); // Load theme preference first
    initCalendar();
    initWeekCounter();
    loadTodos();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadSchedule();
    setupEventListeners();
});

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const startHour = 7; 
const endHour = 20;

// State Variables
let currentSelectedSlot = null;
let tempTodoText = ""; 
let tempPriority = "med"; // default

// --- Initialization & Events ---

function setupEventListeners() {
    // Schedule Modal
    document.getElementById('closeEventModal').addEventListener('click', closeEventModal);
    document.getElementById('saveEventBtn').addEventListener('click', saveEventFromModal);
    document.getElementById('deleteEventBtn').addEventListener('click', deleteEventFromModal);
    document.getElementById('eventInput').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') saveEventFromModal();
    });

    // Todo Creation
    document.getElementById('addTodoBtn').addEventListener('click', initiateAddTodo);
    document.getElementById('todoInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') initiateAddTodo();
    });

    // Todo Modal
    document.getElementById('closeTodoModal').addEventListener('click', closeTodoModal);
    document.getElementById('cancelTodoBtn').addEventListener('click', closeTodoModal);
    document.getElementById('saveTodoDetailsBtn').addEventListener('click', finalizeAddTodo);

    // Priority Selection in Modal
    document.querySelectorAll('.p-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            tempPriority = e.target.dataset.priority;
        });
    });

    // Click outside modals to close
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('eventModal')) closeEventModal();
        if (e.target === document.getElementById('todoModal')) closeTodoModal();
    });
    
    // NEW: Theme Toggle Listener
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }
}

// --- Theme Logic ---

function loadTheme() {
    const isDarkMode = localStorage.getItem('isDarkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        // Set the toggle switch state
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.checked = true;
    }
}

function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('isDarkMode', isDarkMode);
}


// --- Schedule Logic (Smart Colors) ---

function initCalendar() {
    const grid = document.getElementById('calendarGrid');
    
    // Header
    const timeHeader = document.createElement('div');
    timeHeader.className = 'header-cell';
    timeHeader.innerText = 'Time';
    grid.appendChild(timeHeader);
    days.forEach(day => {
        const d = document.createElement('div');
        d.className = 'header-cell';
        d.innerText = day;
        grid.appendChild(d);
    });

    // Slots
    for (let hour = startHour; hour <= endHour; hour++) {
        const tLabel = document.createElement('div');
        tLabel.className = 'time-label';
        tLabel.innerText = `${hour}:00 - ${hour+1}:00`;
        grid.appendChild(tLabel);

        days.forEach((day, index) => {
            const slot = document.createElement('div');
            slot.className = 'slot';
            slot.dataset.day = index;
            slot.dataset.hour = hour;
            slot.addEventListener('click', () => openEventModal(slot));
            grid.appendChild(slot);
        });
    }
}

function openEventModal(slot) {
    currentSelectedSlot = slot;
    const modal = document.getElementById('eventModal');
    const input = document.getElementById('eventInput');
    const title = document.getElementById('eventModalTitle');
    
    title.innerText = `Edit: ${days[slot.dataset.day]} @ ${slot.dataset.hour}:00`;
    input.value = slot.innerText;
    modal.style.display = 'flex';
    input.focus();
}

function closeEventModal() {
    document.getElementById('eventModal').style.display = 'none';
    currentSelectedSlot = null;
}

function saveEventFromModal() {
    if (!currentSelectedSlot) return;
    const input = document.getElementById('eventInput');
    const rawText = input.value.trim();
    
    const day = currentSelectedSlot.dataset.day;
    const hour = currentSelectedSlot.dataset.hour;
    const key = `schedule-${day}-${hour}`;

    if (rawText === "") {
        deleteEventFromModal();
        return;
    }

    // 1. Determine Color (Case Insensitive Reuse)
    const color = getSubjectColor(rawText);

    // 2. Update UI
    currentSelectedSlot.innerText = rawText;
    currentSelectedSlot.style.backgroundColor = color;
    currentSelectedSlot.classList.add('filled');

    // 3. Save to Storage
    localStorage.setItem(key, rawText);
    
    closeEventModal();
}

function deleteEventFromModal() {
    if (!currentSelectedSlot) return;
    const key = `schedule-${currentSelectedSlot.dataset.day}-${currentSelectedSlot.dataset.hour}`;
    
    currentSelectedSlot.innerText = "";
    currentSelectedSlot.style.backgroundColor = ""; // Reset to default slot BG
    currentSelectedSlot.classList.remove('filled');
    localStorage.removeItem(key);
    closeEventModal();
}

// --- COLOR LOGIC ---
// This function ensures "Math" and "math" get same color
function getSubjectColor(text) {
    const normalizeKey = text.trim().toLowerCase();
    
    // Retrieve existing map from storage
    let colorMap = JSON.parse(localStorage.getItem('subjectColors')) || {};
    
    if (colorMap[normalizeKey]) {
        return colorMap[normalizeKey];
    } else {
        // Generate new color
        const hue = Math.floor(Math.random() * 360);
        const newColor = `hsl(${hue}, 90%, 85%)`;
        
        // Save to map
        colorMap[normalizeKey] = newColor;
        localStorage.setItem('subjectColors', JSON.stringify(colorMap));
        return newColor;
    }
}

function loadSchedule() {
    const slots = document.querySelectorAll('.slot');
    slots.forEach(slot => {
        const key = `schedule-${slot.dataset.day}-${slot.dataset.hour}`;
        const savedText = localStorage.getItem(key);
        if (savedText) {
            slot.innerText = savedText;
            slot.classList.add('filled');
            // Re-apply the subject-specific color
            slot.style.backgroundColor = getSubjectColor(savedText);
        }
    });
}

// --- Todo List Logic ---

function initiateAddTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (text === "") return;

    tempTodoText = text;
    
    // Reset Modal Fields
    document.getElementById('todoModalTaskName').innerText = `Adding: "${text}"`;
    document.getElementById('todoDateInput').value = "";
    tempPriority = "med";
    document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('.p-btn.med')?.classList.add('selected');

    // Show Modal
    document.getElementById('todoModal').style.display = 'flex';
}

function closeTodoModal() {
    document.getElementById('todoModal').style.display = 'none';
    document.getElementById('todoInput').value = ""; // Clear main input
}

function finalizeAddTodo() {
    const dateVal = document.getElementById('todoDateInput').value;
    
    const todoObj = {
        id: Date.now(),
        text: tempTodoText,
        deadline: dateVal ? new Date(dateVal).toLocaleString() : "No Deadline",
        priority: tempPriority
    };

    createTodoElement(todoObj);
    saveTodos();
    closeTodoModal();
}

function createTodoElement(todoObj) {
    const list = document.getElementById('todoList');
    const li = document.createElement('li');
    li.className = `todo-item p-${todoObj.priority}`;
    li.dataset.id = todoObj.id;

    li.innerHTML = `
        <div class="todo-header">
            <span class="todo-title">${todoObj.text}</span>
            <div class="todo-actions">
                <button class="btn-icon info-btn" title="View Details">+</button>
                <button class="btn-icon delete-btn" title="Delete">X</button>
            </div>
        </div>
        <div class="todo-details">
            <strong>Deadline:</strong> ${todoObj.deadline} <br>
            <strong>Priority:</strong> ${todoObj.priority.toUpperCase()}
        </div>
    `;

    // Event Listeners for buttons inside this LI
    const infoBtn = li.querySelector('.info-btn');
    const detailsDiv = li.querySelector('.todo-details');
    
    infoBtn.addEventListener('click', () => {
        if(detailsDiv.style.display === "block") {
            detailsDiv.style.display = "none";
            infoBtn.innerText = "+";
        } else {
            detailsDiv.style.display = "block";
            infoBtn.innerText = "-";
        }
    });

    li.querySelector('.delete-btn').addEventListener('click', () => {
        li.remove();
        saveTodos();
    });

    list.appendChild(li);
}

function saveTodos() {
    const todos = [];
    document.querySelectorAll('.todo-item').forEach(li => {
        const title = li.querySelector('.todo-title').innerText;
        const details = li.querySelector('.todo-details').innerHTML;
        
        // Extracting deadline text:
        const deadlineText = details.split('Deadline:</strong> ')[1].split(' <br>')[0];
        
        // Extracting priority class:
        let p = "med";
        if (li.classList.contains('p-high')) p = "high";
        if (li.classList.contains('p-low')) p = "low";

        todos.push({
            id: li.dataset.id,
            text: title,
            deadline: deadlineText,
            priority: p
        });
    });
    localStorage.setItem('advancedTodos', JSON.stringify(todos));
}

function loadTodos() {
    const stored = localStorage.getItem('advancedTodos');
    if (stored) {
        const todos = JSON.parse(stored);
        todos.forEach(obj => createTodoElement(obj));
    }
}

// --- Week Counter (Same as before) ---
function initWeekCounter() {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const pastDays = Math.floor((today - startOfYear) / (24 * 60 * 60 * 1000));
    let weekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);

    if (weekNumber % 2 !== 0) weekNumber++; 

    const isEven = weekNumber % 2 === 0;
    const display = document.getElementById('weekDisplay');
    
    if (isEven) {
        display.innerText = "Current Week: EVEN";
        display.style.backgroundColor = "#27ae60"; 
    } else {
        display.innerText = "Current Week: ODD";
        display.style.backgroundColor = "#e67e22"; 
    }
}

function updateDateTime() {
    const display = document.getElementById('datetimeDisplay');
    const now = new Date();
    
    // Formatting the date (e.g., Tuesday, Dec 2, 2025)
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);

    // Formatting the time (e.g., 5:51:05 PM)
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const formattedTime = now.toLocaleTimeString('en-US', timeOptions);

    display.innerHTML = `${formattedDate} | ${formattedTime}`;
}