document.addEventListener('DOMContentLoaded', () => {
    loadTheme(); 
    initCalendar();
    initWeekCounter();
    loadTodos();
    updateDateTime();
    
    // Update both Clock and Countdowns every second
    setInterval(() => {
        updateDateTime();
        updateCountdowns();
    }, 1000);
    
    loadSchedule();
    setupEventListeners();
});

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const startHour = 7; 
const endHour = 20;

let currentSelectedSlot = null;
let tempTodoText = ""; 
let tempPriority = "med"; 

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

    // Priority Selection
    document.querySelectorAll('.p-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
            e.target.classList.add('selected');
            tempPriority = e.target.dataset.priority;
        });
    });

    // Close Modals on Outside Click
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('eventModal')) closeEventModal();
        if (e.target === document.getElementById('todoModal')) closeTodoModal();
    });
    
    // Theme Toggle
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
        const toggle = document.getElementById('themeToggle');
        if (toggle) toggle.checked = true;
    }
}
function toggleTheme() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('isDarkMode', isDarkMode);
}

// --- Schedule Logic ---
function initCalendar() {
    const grid = document.getElementById('calendarGrid');
    
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
    
    // UPDATE: Force Uppercase for Grid
    const rawText = input.value.trim().toUpperCase();
    
    const day = currentSelectedSlot.dataset.day;
    const hour = currentSelectedSlot.dataset.hour;
    const key = `schedule-${day}-${hour}`;

    if (rawText === "") {
        deleteEventFromModal();
        return;
    }

    const color = getSubjectColor(rawText);

    currentSelectedSlot.innerText = rawText;
    currentSelectedSlot.style.backgroundColor = color;
    currentSelectedSlot.classList.add('filled');

    localStorage.setItem(key, rawText);
    closeEventModal();
}

function deleteEventFromModal() {
    if (!currentSelectedSlot) return;
    const key = `schedule-${currentSelectedSlot.dataset.day}-${currentSelectedSlot.dataset.hour}`;
    
    currentSelectedSlot.innerText = "";
    currentSelectedSlot.style.backgroundColor = ""; 
    currentSelectedSlot.classList.remove('filled');
    localStorage.removeItem(key);
    closeEventModal();
}

function getSubjectColor(text) {
    const normalizeKey = text.trim().toLowerCase();
    let colorMap = JSON.parse(localStorage.getItem('subjectColors')) || {};
    
    if (colorMap[normalizeKey]) {
        return colorMap[normalizeKey];
    } else {
        const hue = Math.floor(Math.random() * 360);
        const newColor = `hsl(${hue}, 90%, 85%)`;
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
    
    document.getElementById('todoModalTaskName').innerText = `Adding: "${text}"`;
    document.getElementById('todoDateInput').value = "";
    tempPriority = "med";
    document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
    document.querySelector('.p-btn.med')?.classList.add('selected');

    document.getElementById('todoModal').style.display = 'flex';
}

function closeTodoModal() {
    document.getElementById('todoModal').style.display = 'none';
    document.getElementById('todoInput').value = ""; 
}

function finalizeAddTodo() {
    const dateVal = document.getElementById('todoDateInput').value;
    
    // Store both display string and raw ISO for calculation
    const deadlineObj = dateVal ? new Date(dateVal) : null;
    
    const todoObj = {
        id: Date.now(),
        text: tempTodoText,
        deadlineISO: deadlineObj ? deadlineObj.toISOString() : "",
        deadlineText: deadlineObj ? deadlineObj.toLocaleString() : "No Deadline",
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
    // Persist ISO date in DOM for saving/loading and Countdown
    li.dataset.deadlineIso = todoObj.deadlineISO || ""; 

    li.innerHTML = `
        <div class="todo-header">
            <span class="todo-title">${todoObj.text}</span>
            <div class="todo-actions">
                <button class="btn-icon info-btn" title="View Details">+</button>
                <button class="btn-icon delete-btn" title="Delete">X</button>
            </div>
        </div>
        <div class="todo-details">
            <strong>Deadline:</strong> ${todoObj.deadlineText} 
            <span class="countdown-timer">--:--:--</span>
            <br>
            <strong>Priority:</strong> ${todoObj.priority.toUpperCase()}
        </div>
    `;

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
    updateCountdowns(); // Update immediately upon creation
}

// UPDATE: Improved Save/Load to include exact deadlineISO
function saveTodos() {
    const todos = [];
    document.querySelectorAll('.todo-item').forEach(li => {
        const title = li.querySelector('.todo-title').innerText;
        // Parse visible text for display restoration
        const details = li.querySelector('.todo-details');
        const deadlineTextLine = details.innerHTML.match(/Deadline:<\/strong> (.*?) <span/); 
        const deadlineText = deadlineTextLine ? deadlineTextLine[1].trim() : "No Deadline";
        
        // Get raw data
        const deadlineISO = li.dataset.deadlineIso;

        let p = "med";
        if (li.classList.contains('p-high')) p = "high";
        if (li.classList.contains('p-low')) p = "low";

        todos.push({
            id: li.dataset.id,
            text: title,
            deadlineText: deadlineText,
            deadlineISO: deadlineISO,
            priority: p
        });
    });
    localStorage.setItem('advancedTodos', JSON.stringify(todos));
}

function loadTodos() {
    const stored = localStorage.getItem('advancedTodos');
    if (stored) {
        const todos = JSON.parse(stored);
        todos.forEach(obj => {
            // Backward compatibility for old saved items without ISO
            if (!obj.deadlineISO && obj.deadline !== "No Deadline") {
                // Try to guess from text (not perfect but helpful)
                const d = new Date(obj.deadline); 
                if (!isNaN(d)) obj.deadlineISO = d.toISOString();
            }
            // Use old property name 'deadline' if new 'deadlineText' missing
            if (!obj.deadlineText) obj.deadlineText = obj.deadline;
            
            createTodoElement(obj);
        });
    }
}

// --- NEW: Countdown Functionality ---
function updateCountdowns() {
    const now = new Date();
    
    document.querySelectorAll('.todo-item').forEach(li => {
        const iso = li.dataset.deadlineIso;
        const timerSpan = li.querySelector('.countdown-timer');
        
        if (!iso || !timerSpan) {
            if (timerSpan) timerSpan.style.display = 'none'; // Hide if no deadline
            return;
        }

        const deadline = new Date(iso);
        const diff = deadline - now;

        if (diff <= 0) {
            timerSpan.innerText = "00h:00m:00s";
            timerSpan.style.color = "#e74c3c"; // Red for expired
        } else {
            const totalSeconds = Math.floor(diff / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            // Format to 00h:00m:00s
            const hStr = hours.toString().padStart(2, '0');
            const mStr = minutes.toString().padStart(2, '0');
            const sStr = seconds.toString().padStart(2, '0');
            
            timerSpan.innerText = `${hStr}h:${mStr}m:${sStr}s`;
            timerSpan.style.display = 'inline-block';
            timerSpan.style.color = "#fff";
        }
    });
}

// --- Week Counter ---
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
    
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);

    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const formattedTime = now.toLocaleTimeString('en-US', timeOptions);

    display.innerHTML = `${formattedDate} | ${formattedTime}`;
}