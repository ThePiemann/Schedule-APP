/* --------------------------
   Global State
   -------------------------- */
const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const startHour = 7;
const endHour = 20;

let currentSelectedSlot = null;
let navDate = new Date(); 
let currentOverviewDate = new Date(); 

// Todo State
let editingTodoId = null;
let currentFilter = 'all'; 

// PDF Library Setup
window.jsPDF = window.jspdf.jsPDF;

document.addEventListener('DOMContentLoaded', () => {
    initCalendar(); 
    renderMonthCalendar(); 
    
    // Default Calendar View
    const todayIndex = new Date().getDay(); 
    const gridIndex = todayIndex === 0 ? 6 : todayIndex - 1;
    showDailyOverview(gridIndex, new Date());

    loadTodos();
    initWeekCounter();
    updateDateTime();
    
    setupEventListeners();
    setupPdfListeners();

    setInterval(() => {
        updateDateTime();
        updateCountdowns();
    }, 1000);
});

function setupEventListeners() {
    // Calendar Events
    safeAddClick('closeEventModal', closeEventModal);
    safeAddClick('saveEventBtn', saveEventFromModal);
    safeAddClick('deleteEventBtn', deleteEventFromModal);
    document.getElementById('eventInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveEventFromModal(); });

    // Task Events
    safeAddClick('addTodoBtn', initiateAddTodo);
    document.getElementById('todoInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') initiateAddTodo(); });
    safeAddClick('closeTodoModal', closeTodoModal);
    safeAddClick('saveTodoDetailsBtn', finalizeAddTodo);
    
    // Filter Buttons
    document.getElementById('filterAllBtn').addEventListener('click', () => setFilter('all'));
    document.getElementById('filterTodayBtn').addEventListener('click', () => setFilter('today'));
    document.getElementById('filterUpcomingBtn').addEventListener('click', () => setFilter('upcoming'));

    // Priority Selection
    document.querySelectorAll('.p-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected', 'ring-2', 'ring-primary'));
            e.currentTarget.classList.add('selected', 'ring-2', 'ring-primary');
        });
    });

    // View Toggles
    document.getElementById('toggleViewBtn').addEventListener('click', toggleCalendarView);
    
    // Month Nav
    document.getElementById('prevMonth').addEventListener('click', () => { navDate.setMonth(navDate.getMonth() - 1); renderMonthCalendar(); });
    document.getElementById('nextMonth').addEventListener('click', () => { navDate.setMonth(navDate.getMonth() + 1); renderMonthCalendar(); });
}

function safeAddClick(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
}

/* --------------------------
   PDF PREVIEW & DOWNLOAD LOGIC
   -------------------------- */
function setupPdfListeners() {
    // 1. Open Modal
    const downloadBtn = document.getElementById('downloadScheduleBtn');
    if(downloadBtn) downloadBtn.addEventListener('click', openPdfPreview);
    
    // 2. Close Modal
    safeAddClick('closePdfModal', closePdfPreview);
    safeAddClick('cancelPdfBtn', closePdfPreview);
    
    // 3. Confirm Download
    safeAddClick('confirmDownloadPdf', generateFinalPdf);
}

function openPdfPreview() {
    const modal = document.getElementById('pdfPreviewModal');
    const printGrid = document.getElementById('printGrid');
    const dateLabel = document.getElementById('printDate');
    
    dateLabel.innerText = "Generated on " + new Date().toLocaleDateString();
    printGrid.innerHTML = '';

    // --- 1. HEADER ROW ---
    const headerRow = document.createElement('div');
    headerRow.className = 'print-header-row';
    
    headerRow.innerHTML = `<div class="p-3 text-center flex items-center justify-center">Time</div>`; 
    
    days.forEach(d => {
        headerRow.innerHTML += `<div class="p-3 text-center border-l border-gray-700 flex items-center justify-center">${d}</div>`;
    });
    printGrid.appendChild(headerRow);

    // --- 2. DATA ROWS ---
    for (let h = startHour; h <= endHour; h++) {
        const row = document.createElement('div');
        row.className = 'print-row';
        
        // Time Column
        const timeCol = document.createElement('div');
        timeCol.className = 'print-time-col';
        timeCol.innerText = `${h}:00`;
        row.appendChild(timeCol);

        // Slots
        for (let d = 0; d < 7; d++) {
            const slot = document.createElement('div');
            slot.className = 'print-slot-col';
            
            const rawData = localStorage.getItem(`schedule-${d}-${h}`);
            if (rawData) {
                const data = parseSlotData(rawData, h);
                const color = getSubjectColor(data.subject);
                
                slot.innerHTML = `
                    <div style="background-color: ${color};" class="print-event-card">
                        <div class="font-bold text-[9px] uppercase leading-tight">${data.subject}</div>
                        <div class="text-[8px] mt-0.5 opacity-75">${data.start} - ${data.end}</div>
                        ${data.location ? `<div class="text-[8px] mt-0.5 opacity-60 truncate">${data.location}</div>` : ''}
                    </div>
                `;
            }
            row.appendChild(slot);
        }
        printGrid.appendChild(row);
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closePdfPreview() {
    const modal = document.getElementById('pdfPreviewModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function generateFinalPdf() {
    const originalElement = document.getElementById('printContainer');
    const btn = document.getElementById('confirmDownloadPdf');
    const originalText = btn.innerHTML;

    btn.innerHTML = `<span class="material-symbols-outlined animate-spin text-lg">progress_activity</span> Generating...`;
    btn.disabled = true;

    // Clone & Capture Method
    const clone = originalElement.cloneNode(true);
    const cloneWrapper = document.createElement('div');
    cloneWrapper.style.position = 'fixed';
    cloneWrapper.style.top = '-10000px'; 
    cloneWrapper.style.left = '-10000px';
    cloneWrapper.style.zIndex = '-1';
    cloneWrapper.style.width = '1100px'; 
    cloneWrapper.appendChild(clone);
    document.body.appendChild(cloneWrapper);

    html2canvas(clone, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4'); 
        
        const pageWidth = pdf.internal.pageSize.getWidth();   
        const pageHeight = pdf.internal.pageSize.getHeight(); 
        const imgProps = pdf.getImageProperties(imgData);
        
        let finalPdfWidth = pageWidth;
        let finalPdfHeight = (imgProps.height * pageWidth) / imgProps.width;

        if (finalPdfHeight > pageHeight) {
            const scaleFactor = pageHeight / finalPdfHeight;
            finalPdfWidth = pageWidth * scaleFactor;
            finalPdfHeight = pageHeight;
        }

        const xPos = (pageWidth - finalPdfWidth) / 2;
        pdf.addImage(imgData, 'PNG', xPos, 0, finalPdfWidth, finalPdfHeight);
        pdf.save('StudentDash_Schedule.pdf');

        document.body.removeChild(cloneWrapper);
        btn.innerHTML = originalText;
        btn.disabled = false;
        closePdfPreview();
    }).catch(err => {
        console.error("PDF Error:", err);
        alert("Error generating PDF.");
        if (document.body.contains(cloneWrapper)) document.body.removeChild(cloneWrapper);
        btn.innerHTML = originalText;
        btn.disabled = false;
    });
}

/* --------------------------
   DATA PARSING HELPER
   -------------------------- */
function parseSlotData(rawData, defaultHour) {
    if (!rawData) return null;
    try {
        if (rawData.startsWith('{')) {
            return JSON.parse(rawData);
        }
    } catch(e) {}
    
    return {
        subject: rawData,
        start: `${defaultHour.toString().padStart(2,'0')}:00`,
        end: `${(defaultHour + 1).toString().padStart(2,'0')}:00`,
        location: ""
    };
}

/* --------------------------
   Todo Logic (UPDATED)
   -------------------------- */
function setFilter(type) {
    currentFilter = type;
    const allBtn = document.getElementById('filterAllBtn');
    const todayBtn = document.getElementById('filterTodayBtn');
    const upcomingBtn = document.getElementById('filterUpcomingBtn');

    const inactiveClass = "px-4 py-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors";
    const activeClass = "px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold transition-colors";

    allBtn.className = (type === 'all') ? activeClass : inactiveClass;
    todayBtn.className = (type === 'today') ? activeClass : inactiveClass;
    upcomingBtn.className = (type === 'upcoming') ? activeClass : inactiveClass;

    loadTodos();
}

function initiateAddTodo() {
    const input = document.getElementById('todoInput');
    const text = input.value.trim();
    if (!text) return;
    editingTodoId = null;
    document.getElementById('todoModalTitle').innerText = "New Task";
    document.getElementById('todoModalNameInput').value = text;
    document.getElementById('todoDateInput').value = '';
    document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected', 'ring-2', 'ring-primary'));
    document.querySelector('.p-btn.med')?.classList.add('selected', 'ring-2', 'ring-primary');
    const modal = document.getElementById('todoModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

function initiateEditTodo(id) {
    const todos = JSON.parse(localStorage.getItem('advancedTodos') || '[]');
    const todo = todos.find(t => t.id == id);
    if(!todo) return;
    editingTodoId = id;
    document.getElementById('todoModalTitle').innerText = "Edit Task";
    document.getElementById('todoModalNameInput').value = todo.text;
    if(todo.deadlineISO) {
        const d = new Date(todo.deadlineISO);
        const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        document.getElementById('todoDateInput').value = localIso;
    } else {
        document.getElementById('todoDateInput').value = '';
    }
    document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected', 'ring-2', 'ring-primary'));
    const pBtn = document.querySelector(`.p-btn[data-priority="${todo.priority}"]`);
    if(pBtn) pBtn.classList.add('selected', 'ring-2', 'ring-primary');
    const modal = document.getElementById('todoModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
}

function finalizeAddTodo() {
    const nameVal = document.getElementById('todoModalNameInput').value.trim();
    if (!nameVal) return;
    const dateVal = document.getElementById('todoDateInput').value;
    const deadlineObj = dateVal ? new Date(dateVal) : null;
    let priority = 'med';
    const selectedP = document.querySelector('.p-btn.selected');
    if(selectedP) priority = selectedP.dataset.priority;
    const todos = JSON.parse(localStorage.getItem('advancedTodos') || '[]');

    if (editingTodoId) {
        const index = todos.findIndex(t => t.id == editingTodoId);
        if (index > -1) {
            todos[index].text = nameVal;
            todos[index].deadlineISO = deadlineObj ? deadlineObj.toISOString() : "";
            todos[index].deadlineText = deadlineObj ? deadlineObj.toLocaleString('en-US', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : "No Deadline";
            todos[index].priority = priority;
        }
    } else {
        const todoObj = {
            id: Date.now(),
            text: nameVal,
            deadlineISO: deadlineObj ? deadlineObj.toISOString() : "",
            deadlineText: deadlineObj ? deadlineObj.toLocaleString('en-US', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : "No Deadline",
            priority: priority
        };
        todos.push(todoObj);
    }
    saveTodos(todos); renderTodos(todos); closeTodoModal();
    document.getElementById('todoInput').value = ''; 
}

function closeTodoModal() { document.getElementById('todoModal').classList.add('hidden'); document.getElementById('todoModal').classList.remove('flex'); }
function saveTodos(todos) { localStorage.setItem('advancedTodos', JSON.stringify(todos)); }
function loadTodos() { renderTodos(JSON.parse(localStorage.getItem('advancedTodos') || '[]')); }

function renderTodos(todos) {
    const list = document.getElementById('todoList');
    list.innerHTML = '';
    let filteredTodos = todos;
    
    if (currentFilter === 'today') {
        const todayStr = new Date().toDateString();
        filteredTodos = todos.filter(t => {
            if (!t.deadlineISO) return false;
            return new Date(t.deadlineISO).toDateString() === todayStr;
        });
    } else if (currentFilter === 'upcoming') {
        const today = new Date();
        today.setHours(0,0,0,0);
        filteredTodos = todos.filter(t => {
            if (!t.deadlineISO) return false;
            const d = new Date(t.deadlineISO);
            d.setHours(0,0,0,0);
            return d > today; 
        });
    }

    filteredTodos.sort((a,b) => {
        const pVal = { high: 3, med: 2, low: 1 };
        const pDiff = pVal[b.priority] - pVal[a.priority];
        if (pDiff !== 0) return pDiff;
        const tA = a.deadlineISO ? new Date(a.deadlineISO).getTime() : 9999999999999;
        const tB = b.deadlineISO ? new Date(b.deadlineISO).getTime() : 9999999999999;
        return tA - tB;
    });
    if (filteredTodos.length === 0) {
        list.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm italic">No tasks found.</div>`;
        return;
    }
    filteredTodos.forEach(t => createTodoElement(t, list));
}

function createTodoElement(todoObj, container) {
    const div = document.createElement('div');
    div.className = "flex items-center gap-4 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group border border-transparent hover:border-gray-200 dark:hover:border-gray-600 cursor-pointer";
    div.dataset.id = todoObj.id; div.dataset.deadlineIso = todoObj.deadlineISO || "";

    let dotColor = 'bg-yellow-500';
    if(todoObj.priority === 'high') dotColor = 'bg-red-500';
    if(todoObj.priority === 'low') dotColor = 'bg-green-500';

    div.innerHTML = `
        <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">${escapeHtml(todoObj.text)}</p>
            <div class="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                <span>${todoObj.deadlineText}</span>
                <span class="hidden countdown-timer font-mono text-primary font-bold"></span>
            </div>
        </div>
        <div class="w-3 h-3 rounded-full ${dotColor} shrink-0"></div>
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="edit-btn text-blue-500 hover:bg-blue-100 p-1 rounded" title="Edit"><span class="material-symbols-outlined text-lg">edit</span></button>
            <button class="delete-btn text-red-500 hover:bg-red-100 p-1 rounded" title="Delete"><span class="material-symbols-outlined text-lg">delete</span></button>
        </div>
    `;
    div.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); initiateEditTodo(todoObj.id); });
    div.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); let todos = JSON.parse(localStorage.getItem('advancedTodos')); todos = todos.filter(t => t.id != todoObj.id); saveTodos(todos); renderTodos(todos); });
    container.appendChild(div);
}

/* --------------------------
   Utils (UPDATED)
   -------------------------- */
function updateCountdowns() {
    const now = new Date();
    document.querySelectorAll('#todoList > div').forEach(div => {
        const iso = div.dataset.deadlineIso;
        const timerSpan = div.querySelector('.countdown-timer');
        if(!iso || !timerSpan) return;
        
        const diff = new Date(iso) - now;
        
        if(diff <= 0) {
            timerSpan.innerText = "Overdue"; 
            timerSpan.classList.remove('hidden'); 
            timerSpan.classList.add('text-red-500');
        } else {
            timerSpan.classList.remove('hidden');
            timerSpan.classList.remove('text-red-500');
            
            // Fix: Logic for > 24 hours format
            const oneDay = 86400000; // 24 * 60 * 60 * 1000
            if (diff > oneDay) {
                const d = Math.floor(diff / oneDay);
                const h = Math.floor((diff % oneDay) / 3600000);
                timerSpan.innerText = `${d}d ${h}h`;
            } else {
                const h = Math.floor(diff / 3600000); 
                const m = Math.floor((diff % 3600000) / 60000);
                timerSpan.innerText = `${h}h ${m}m`;
            }
        }
    });
}

function updateDateTime() {
    const d = document.getElementById('datetimeDisplay');
    if(d) d.innerText = new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' });
}
function initWeekCounter() {
    const d = new Date();
    const weekNum = Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7);
    const div = document.getElementById('weekDisplay');
    div.innerText = weekNum % 2 === 0 ? "Week: EVEN" : "Week: ODD";
    div.className = weekNum % 2 === 0 ? "text-xs font-bold px-3 py-1 rounded bg-green-100 text-green-700" : "text-xs font-bold px-3 py-1 rounded bg-orange-100 text-orange-700";
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* --------------------------
   CALENDAR LOGIC (Standard + DnD)
   -------------------------- */
function toggleCalendarView() {
    const monthView = document.getElementById('monthView');
    const weekView = document.getElementById('weekView');
    const btnText = document.getElementById('toggleBtnText');
    const nav = document.getElementById('monthNav');
    const title = document.getElementById('calendarTitle');
    const downloadBtn = document.getElementById('downloadScheduleBtn'); 

    if (monthView.classList.contains('hidden')) {
        // --- Switching to MONTH VIEW (Overview) ---
        monthView.classList.remove('hidden'); 
        weekView.classList.add('hidden');
        weekView.classList.remove('flex');
        
        btnText.innerText = "Edit"; 
        nav.classList.remove('hidden'); 
        title.innerText = "Class Schedule";
        
        // HIDE Download Button
        downloadBtn.classList.add('hidden');
        downloadBtn.classList.remove('flex');

        renderMonthCalendar();
    } else {
        // --- Switching to WEEK VIEW (Editor) ---
        monthView.classList.add('hidden'); 
        weekView.classList.remove('hidden'); 
        weekView.classList.add('flex');
        
        btnText.innerText = "Back"; 
        nav.classList.add('hidden'); 
        title.innerText = "Weekly Editor";

        // SHOW Download Button
        downloadBtn.classList.remove('hidden');
        downloadBtn.classList.add('flex');
    }
}

// Refresh all views
function refreshAllViews() {
    initCalendar(); // Update Weekly Editor
    renderMonthCalendar(); // Update Month Dots
    
    // Refresh the Side Panel based on whatever date was last selected
    const dayIndex = currentOverviewDate.getDay() === 0 ? 6 : currentOverviewDate.getDay() - 1;
    showDailyOverview(dayIndex, currentOverviewDate);
}

function renderMonthCalendar() {
    const grid = document.getElementById('monthGrid');
    const monthLabel = document.getElementById('currentMonthLabel');
    grid.innerHTML = "";
    const year = navDate.getFullYear();
    const month = navDate.getMonth();
    monthLabel.innerText = new Date(year, month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = "month-day text-gray-700 dark:text-gray-300";
        dayDiv.innerText = d;
        if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) dayDiv.classList.add('today');
        let dayOfWeek = new Date(year, month, d).getDay(); 
        let arrayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
        
        let hasClass = false;
        for (let h = startHour; h <= endHour; h++) {
            if (localStorage.getItem(`schedule-${arrayIndex}-${h}`)) hasClass = true;
        }

        if (hasClass) {
            const dot = document.createElement('div'); dot.className = "class-dot"; dayDiv.appendChild(dot);
        }
        dayDiv.addEventListener('click', () => {
            document.querySelectorAll('.month-day').forEach(el => el.classList.remove('selected-day'));
            dayDiv.classList.add('selected-day');
            showDailyOverview(arrayIndex, new Date(year, month, d));
        });
        grid.appendChild(dayDiv);
    }
}

function showDailyOverview(dayIndex, dateObj) {
    currentOverviewDate = dateObj; // Update Global State

    const container = document.getElementById('dailyOverview');
    const label = document.getElementById('overviewDateLabel');
    container.innerHTML = "";
    if(dateObj) label.innerText = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric'});
    
    let hasClass = false;
    for (let h = startHour; h <= endHour; h++) {
        const rawData = localStorage.getItem(`schedule-${dayIndex}-${h}`);
        if (rawData) {
            hasClass = true;
            const data = parseSlotData(rawData, h);
            const color = getSubjectColor(data.subject); 
            
            const div = document.createElement('div');
            div.className = "flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-white/5 transition";
            div.innerHTML = `
                <div class="w-1 h-12 rounded-full mt-1" style="background-color: ${color}"></div>
                <div class="flex-1">
                    <p class="text-sm font-bold text-gray-800 dark:text-gray-200">${data.subject}</p>
                    <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span class="material-symbols-outlined text-[10px]">schedule</span>
                        <span>${data.start} - ${data.end}</span>
                    </div>
                    ${data.location ? `
                    <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span class="material-symbols-outlined text-[10px]">location_on</span>
                        <span>${data.location}</span>
                    </div>` : ''}
                </div>
            `;
            container.appendChild(div);
        }
    }
    if (!hasClass) container.innerHTML = `<div class="text-center py-2 text-gray-400 text-xs italic">No classes.</div>`;
}

function initCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const timeHeader = document.createElement('div'); timeHeader.className = 'header-cell'; timeHeader.innerText = 'TIME'; grid.appendChild(timeHeader);
    days.forEach(day => { const dh = document.createElement('div'); dh.className = 'header-cell'; dh.innerText = day; grid.appendChild(dh); });
    for (let hour = startHour; hour <= endHour; hour++) {
        const tLabel = document.createElement('div'); tLabel.className = 'time-label'; tLabel.innerText = `${hour}:00`; grid.appendChild(tLabel);
        days.forEach((d, index) => {
            const slot = document.createElement('div'); 
            slot.className = 'slot'; 
            slot.dataset.day = index; 
            slot.dataset.hour = hour;
            
            // Drag Drop Events
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('dragenter', handleDragEnter);
            slot.addEventListener('dragleave', handleDragLeave);
            slot.addEventListener('drop', handleDrop);

            // Click event
            slot.addEventListener('click', (e) => {
                if(slot.classList.contains('just-dropped')) {
                    slot.classList.remove('just-dropped');
                    return;
                }
                openEventModal(slot);
            });
            
            const rawData = localStorage.getItem(`schedule-${index}-${hour}`);
            if(rawData) { 
                const data = parseSlotData(rawData, hour);
                slot.style.backgroundColor = getSubjectColor(data.subject); 
                slot.style.color = '#333'; 
                
                // DRAGGABLE
                slot.draggable = true;
                slot.addEventListener('dragstart', handleDragStart);

                slot.innerHTML = `
                    <div class="font-bold truncate pointer-events-none">${data.subject}</div>
                    <div class="text-[10px] opacity-70 leading-tight pointer-events-none">${data.start}-${data.end}</div>
                    ${data.location ? `<div class="text-[9px] opacity-60 truncate pointer-events-none">${data.location}</div>` : ''}
                `;
            }
            grid.appendChild(slot);
        });
    }
}

/* --- Drag and Drop Handlers --- */
function handleDragStart(e) {
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
    const dragData = { day: this.dataset.day, hour: this.dataset.hour };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) { this.classList.add('drag-over'); }
function handleDragLeave(e) { this.classList.remove('drag-over'); }

function handleDrop(e) {
    e.stopPropagation(); 
    e.preventDefault();
    this.classList.remove('drag-over');

    const sourceDataString = e.dataTransfer.getData('application/json');
    if(!sourceDataString) return; 

    const sourcePos = JSON.parse(sourceDataString);
    const targetDay = this.dataset.day;
    const targetHour = parseInt(this.dataset.hour);
    
    const sourceKey = `schedule-${sourcePos.day}-${sourcePos.hour}`;
    const targetKey = `schedule-${targetDay}-${targetHour}`;

    if (sourcePos.day == targetDay && sourcePos.hour == targetHour) {
        document.querySelector(`.slot[data-day="${sourcePos.day}"][data-hour="${sourcePos.hour}"]`).style.opacity = '1';
        return;
    }

    const sourceRaw = localStorage.getItem(sourceKey);
    const targetRaw = localStorage.getItem(targetKey);

    // Update Times
    let sourceObj = sourceRaw ? parseSlotData(sourceRaw, parseInt(sourcePos.hour)) : null;
    if (sourceObj) {
        sourceObj.start = `${targetHour.toString().padStart(2,'0')}:00`;
        sourceObj.end = `${(targetHour+1).toString().padStart(2,'0')}:00`;
    }

    let targetObj = targetRaw ? parseSlotData(targetRaw, targetHour) : null;
    if (targetObj) {
        const sHour = parseInt(sourcePos.hour);
        targetObj.start = `${sHour.toString().padStart(2,'0')}:00`;
        targetObj.end = `${(sHour+1).toString().padStart(2,'0')}:00`;
    }

    if (sourceObj) localStorage.setItem(targetKey, JSON.stringify(sourceObj));
    else localStorage.removeItem(targetKey);

    if (targetObj) localStorage.setItem(sourceKey, JSON.stringify(targetObj));
    else localStorage.removeItem(sourceKey);

    this.classList.add('just-dropped'); 
    refreshAllViews(); 
}

/* --------------------------
   Modal & Event Helpers
   -------------------------- */
function openEventModal(slot) { 
    currentSelectedSlot = slot; 
    const modal = document.getElementById('eventModal'); 
    
    const hour = parseInt(slot.dataset.hour);
    const rawData = localStorage.getItem(`schedule-${slot.dataset.day}-${hour}`);
    
    if (rawData) {
        const data = parseSlotData(rawData, hour);
        document.getElementById('eventInput').value = data.subject;
        document.getElementById('startTimeInput').value = data.start;
        document.getElementById('endTimeInput').value = data.end;
        document.getElementById('locationInput').value = data.location;
    } else {
        document.getElementById('eventInput').value = '';
        document.getElementById('startTimeInput').value = `${hour.toString().padStart(2,'0')}:00`;
        document.getElementById('endTimeInput').value = `${(hour+1).toString().padStart(2,'0')}:00`;
        document.getElementById('locationInput').value = '';
    }

    modal.classList.remove('hidden'); 
    modal.classList.add('flex'); 
    document.getElementById('eventInput').focus(); 
}

function closeEventModal() { document.getElementById('eventModal').classList.add('hidden'); document.getElementById('eventModal').classList.remove('flex'); currentSelectedSlot = null; }

function saveEventFromModal() {
    if (!currentSelectedSlot) return;
    const text = document.getElementById('eventInput').value.trim().toUpperCase();
    const start = document.getElementById('startTimeInput').value;
    const end = document.getElementById('endTimeInput').value;
    const loc = document.getElementById('locationInput').value.trim();
    
    const key = `schedule-${currentSelectedSlot.dataset.day}-${currentSelectedSlot.dataset.hour}`;
    
    if (text === "") { deleteEventFromModal(); return; }

    const eventData = {
        subject: text,
        start: start,
        end: end,
        location: loc
    };

    localStorage.setItem(key, JSON.stringify(eventData));
    closeEventModal(); 
    refreshAllViews();
}

function deleteEventFromModal() {
    if (!currentSelectedSlot) return;
    const key = `schedule-${currentSelectedSlot.dataset.day}-${currentSelectedSlot.dataset.hour}`;
    localStorage.removeItem(key); 
    closeEventModal(); 
    refreshAllViews();
}

function getSubjectColor(text) {
    if (!text) return ''; const key = text.trim().toLowerCase(); let colorMap = JSON.parse(localStorage.getItem('subjectColors')) || {};
    if (colorMap[key]) return colorMap[key]; const hue = Math.floor(Math.random() * 360);
    const newColor = `hsl(${hue}, 85%, 85%)`; colorMap[key] = newColor; localStorage.setItem('subjectColors', JSON.stringify(colorMap)); return newColor;
}