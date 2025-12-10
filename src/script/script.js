/* --------------------------
   Global State
   -------------------------- */
const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const startHour = 7;
const endHour = 20;

let currentSelectedSlot = null;
let navDate = new Date(); 
let currentOverviewDate = new Date(); 

// New State
let isEvenWeek = false;

// Todo State
let editingTodoId = null;
let currentFilter = 'all'; 
let todoToDeleteId = null; 

/* --------------------------
   UTILITIES
   -------------------------- */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}

function linkify(text) {
    if (!text) return '';
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" class="text-blue-500 hover:underline relative z-20" onclick="event.stopPropagation()">${url}</a>`;
    });
}

function updateDateTime() {
    const d = document.getElementById('datetimeDisplay');
    if(d) d.innerText = new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' });
}

function initWeekCounter() {
    const div = document.getElementById('weekDisplay');
    if(!div) return;

    const showCounter = localStorage.getItem('showWeekCounter') === 'true';
    if (!showCounter) {
        div.classList.add('hidden');
        return;
    }
    div.classList.remove('hidden');

    const d = new Date();
    let weekNum = Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7);
    weekNum += 1; 
    
    const invert = localStorage.getItem('weekParityInvert') === 'true';
    let isEven = (weekNum % 2 === 0);
    
    if (invert) isEven = !isEven;
    
    isEvenWeek = isEven; 

    div.innerText = isEven ? "Week: EVEN" : "Week: ODD";
    div.className = "week-badge text-xs font-bold px-3 py-1 rounded transition-colors";
}

/* --------------------------
   INIT
   -------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    initCalendar(); 
    currentOverviewDate = new Date(); 
    initWeekCounter(); 
    renderMonthCalendar(); 
    
    const todayIndex = new Date().getDay(); 
    const gridIndex = todayIndex === 0 ? 6 : todayIndex - 1;
    showDailyOverview(gridIndex, new Date());

    loadTodos();
    updateDateTime();
    
    setupEventListeners();
    setupModalInputs(); 
    if (typeof setupPdfListeners === "function") setupPdfListeners();

    setInterval(() => {
        updateDateTime();
        updateCountdowns();
    }, 1000);
});

function setupEventListeners() {
    safeAddClick('closeEventModal', closeEventModal);
    safeAddClick('saveEventBtn', saveEventFromModal);
    safeAddClick('deleteEventBtn', deleteEventFromModal);
    document.getElementById('eventInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveEventFromModal(); });

    safeAddClick('addTodoBtn', initiateAddTodo);
    document.getElementById('todoInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') initiateAddTodo(); });
    
    // Updated Cancel Button ID
    safeAddClick('cancelTodoBtn', closeTodoModal); 
    safeAddClick('saveTodoDetailsBtn', finalizeAddTodo);
    
    document.getElementById('filterAllBtn').addEventListener('click', () => setFilter('all'));
    document.getElementById('filterTodayBtn').addEventListener('click', () => setFilter('today'));
    document.getElementById('filterUpcomingBtn').addEventListener('click', () => setFilter('upcoming'));

    document.querySelectorAll('.p-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected', 'ring-2', 'ring-primary'));
            e.currentTarget.classList.add('selected', 'ring-2', 'ring-primary');
        });
    });

    document.getElementById('toggleViewBtn').addEventListener('click', toggleCalendarView);
    document.getElementById('prevMonth').addEventListener('click', () => { navDate.setMonth(navDate.getMonth() - 1); renderMonthCalendar(); });
    document.getElementById('nextMonth').addEventListener('click', () => { navDate.setMonth(navDate.getMonth() + 1); renderMonthCalendar(); });
    
    safeAddClick('closeNoteBtn', closeNoteModal);
    safeAddClick('saveNoteBtn', saveNoteFromModal);
    safeAddClick('cancelDeleteBtn', closeDeleteModal);
    safeAddClick('confirmDeleteBtn', confirmDeleteTodo);
    
    // Bind Pin Toggle in Modal
    safeAddClick('todoModalPinBtn', toggleModalPinState);
}

function setupModalInputs() {
    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            colorBtns.forEach(b => {
                b.classList.remove('ring-offset-2', 'ring-gray-400', 'scale-110');
                b.classList.add('ring-transparent');
            });
            const target = e.target;
            target.classList.remove('ring-transparent');
            target.classList.add('ring-offset-2', 'ring-gray-400', 'scale-110');
            document.getElementById('selectedColorInput').value = target.dataset.color;
        });
    });

    const weekBtns = document.querySelectorAll('.week-type-btn');
    weekBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            weekBtns.forEach(b => {
                b.className = "week-type-btn flex-1 py-1 text-xs font-bold rounded text-gray-500 hover:text-gray-700 transition";
            });
            e.target.className = "week-type-btn flex-1 py-1 text-xs font-bold rounded shadow-sm bg-white dark:bg-gray-600 text-primary transition";
            document.getElementById('weekTypeInput').value = e.target.dataset.val;
        });
    });
}

function safeAddClick(id, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
}

/* --------------------------
   DATA & COLORS
   -------------------------- */
function getSubjectColor(subject) {
    if (!subject) return '#F3F4F6';
    const key = subject.trim().toUpperCase();
    let colorMap = JSON.parse(localStorage.getItem('subjectColors') || '{}');
    if (colorMap[key]) return colorMap[key];
    const hue = Math.floor(Math.random() * 360);
    const newColor = `hsl(${hue}, 95%, 90%)`; 
    colorMap[key] = newColor;
    localStorage.setItem('subjectColors', JSON.stringify(colorMap));
    return newColor;
}

function parseSlotData(rawData, defaultHour) {
    if (!rawData) return null;
    try {
        if (rawData.startsWith('{')) {
            const data = JSON.parse(rawData);
            if(!data.type) data.type = "";
            if(!data.teacher) data.teacher = "";
            if(!data.weekType) data.weekType = "every";
            if(!data.color || data.color === "#F3F4F6") {
                data.color = getSubjectColor(data.subject);
            }
            return data;
        }
    } catch(e) {}
    return {
        subject: rawData,
        start: `${defaultHour.toString().padStart(2,'0')}:00`,
        end: `${(defaultHour + 1).toString().padStart(2,'0')}:00`,
        location: "",
        type: "",
        teacher: "",
        color: getSubjectColor(rawData),
        weekType: "every"
    };
}

/* --------------------------
   RENDERING
   -------------------------- */
function showDailyOverview(dayIndex, dateObj) {
    currentOverviewDate = dateObj; 
    const container = document.getElementById('dailyOverview');
    const label = document.getElementById('overviewDateLabel');
    container.innerHTML = "";
    if(dateObj) label.innerText = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric'});
    
    let hasClass = false;
    let delayCounter = 0; 

    for (let h = startHour; h <= endHour; h++) {
        const rawData = localStorage.getItem(`schedule-${dayIndex}-${h}`);
        if (rawData) {
            const data = parseSlotData(rawData, h);
            hasClass = true;
            
            const div = document.createElement('div');
            div.className = "class-entry-animate flex items-stretch gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-white/5 transition";
            div.style.animationDelay = `${delayCounter * 0.1}s`; 
            
            div.innerHTML = `
                <div class="w-1.5 rounded-full shadow-sm flex-shrink-0" style="background-color: ${data.color}"></div>
                <div class="flex-1 flex justify-between gap-2 py-1">
                    <div class="flex flex-col justify-center">
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight">${data.subject}</p>
                        <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span class="material-symbols-outlined text-[10px]">schedule</span>
                            <span>${data.start} - ${data.end}</span>
                        </div>
                        ${data.location ? `<div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5"><span class="material-symbols-outlined text-[10px]">location_on</span><span>${data.location}</span></div>` : ''}
                        ${data.teacher ? `<div class="flex items-center gap-1 text-xs text-primary/80 dark:text-blue-400 mt-1 font-medium"><span class="material-symbols-outlined text-[10px]">person</span><span>${data.teacher}</span></div>` : ''}
                    </div>
                    <div class="flex flex-col items-end gap-1">
                        ${data.type ? `<span class="text-[9px] uppercase font-bold bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded tracking-wide">${data.type}</span>` : ''}
                        ${data.weekType !== 'every' ? `<span class="text-[8px] uppercase font-bold border border-gray-200 dark:border-gray-600 text-gray-400 px-1.5 py-0.5 rounded tracking-wide whitespace-nowrap">${data.weekType} ONLY</span>` : ''}
                    </div>
                </div>
            `;
            container.appendChild(div);
            delayCounter++;
        }
    }
    if (!hasClass) container.innerHTML = `<div class="text-center py-2 text-gray-400 text-xs italic animate-fade-in">No classes.</div>`;
}

function initCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    const timeHeader = document.createElement('div'); timeHeader.className = 'header-cell'; timeHeader.innerText = 'TIME'; grid.appendChild(timeHeader);
    days.forEach(day => { const dh = document.createElement('div'); dh.className = 'header-cell'; dh.innerText = day; grid.appendChild(dh); });
    
    let gridDelayCounter = 0; 

    for (let hour = startHour; hour <= endHour; hour++) {
        const tLabel = document.createElement('div'); tLabel.className = 'time-label'; tLabel.innerText = `${hour}:00`; grid.appendChild(tLabel);
        days.forEach((d, index) => {
            const slot = document.createElement('div'); 
            slot.className = 'slot group'; 
            slot.dataset.day = index; 
            slot.dataset.hour = hour;
            
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('dragenter', handleDragEnter);
            slot.addEventListener('dragleave', handleDragLeave);
            slot.addEventListener('drop', handleDrop);
            slot.addEventListener('click', (e) => {
                if(slot.classList.contains('just-dropped')) { slot.classList.remove('just-dropped'); return; }
                openEventModal(slot);
            });
            
            const rawData = localStorage.getItem(`schedule-${index}-${hour}`);
            if(rawData) { 
                const data = parseSlotData(rawData, hour);
                slot.style.backgroundColor = data.color; 
                slot.style.color = '#1f2937'; 
                slot.draggable = true;
                slot.addEventListener('dragstart', handleDragStart);

                slot.innerHTML = `
                    <div class="class-entry-animate w-full h-full relative" style="animation-delay: ${gridDelayCounter * 0.05}s">
                        ${data.weekType !== 'every' ? `<div class="absolute top-1 left-1 text-[8px] font-black uppercase tracking-wider text-gray-500 opacity-60 pointer-events-none select-none">${data.weekType}</div>` : ''}
                        ${data.location ? `<div class="absolute top-1 right-1 text-[9px] font-bold text-gray-600 opacity-80 pointer-events-none select-none">${data.location}</div>` : ''}
                        <div class="absolute inset-0 flex flex-col justify-center items-center pointer-events-none px-1">
                            <div class="font-black text-[11px] leading-tight uppercase tracking-tight text-gray-900 line-clamp-2">${data.subject}</div>
                            <div class="text-[9px] font-semibold text-gray-500 mt-0.5">${data.start}-${data.end}</div>
                        </div>
                        ${data.type ? `<div class="absolute bottom-1 right-1 text-[8px] font-bold uppercase text-gray-500 tracking-wider opacity-80 pointer-events-none select-none">${data.type}</div>` : ''}
                    </div>
                `;
                gridDelayCounter++;
            }
            grid.appendChild(slot);
        });
    }
}

/* --- Drag and Drop --- */
function handleDragStart(e) { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('application/json', JSON.stringify({ day: this.dataset.day, hour: this.dataset.hour })); this.style.opacity = '0.4'; }
function handleDragOver(e) { if (e.preventDefault) e.preventDefault(); e.dataTransfer.dropEffect = 'move'; return false; }
function handleDragEnter(e) { this.classList.add('drag-over'); }
function handleDragLeave(e) { this.classList.remove('drag-over'); }
function handleDrop(e) {
    e.stopPropagation(); e.preventDefault(); this.classList.remove('drag-over');
    const sourceDataString = e.dataTransfer.getData('application/json');
    if(!sourceDataString) return; 
    const sourcePos = JSON.parse(sourceDataString);
    const targetDay = this.dataset.day; const targetHour = parseInt(this.dataset.hour);
    const sourceKey = `schedule-${sourcePos.day}-${sourcePos.hour}`; const targetKey = `schedule-${targetDay}-${targetHour}`;
    if (sourcePos.day == targetDay && sourcePos.hour == targetHour) { document.querySelector(`.slot[data-day="${sourcePos.day}"][data-hour="${sourcePos.hour}"]`).style.opacity = '1'; return; }
    
    const sourceRaw = localStorage.getItem(sourceKey); const targetRaw = localStorage.getItem(targetKey);
    let sourceObj = sourceRaw ? parseSlotData(sourceRaw, parseInt(sourcePos.hour)) : null;
    if (sourceObj) { sourceObj.start = `${targetHour.toString().padStart(2,'0')}:00`; sourceObj.end = `${(targetHour+1).toString().padStart(2,'0')}:00`; }
    let targetObj = targetRaw ? parseSlotData(targetRaw, targetHour) : null;
    if (targetObj) { const sHour = parseInt(sourcePos.hour); targetObj.start = `${sHour.toString().padStart(2,'0')}:00`; targetObj.end = `${(sHour+1).toString().padStart(2,'0')}:00`; }
    
    if (sourceObj) localStorage.setItem(targetKey, JSON.stringify(sourceObj)); else localStorage.removeItem(targetKey);
    if (targetObj) localStorage.setItem(sourceKey, JSON.stringify(targetObj)); else localStorage.removeItem(sourceKey);
    this.classList.add('just-dropped'); refreshAllViews(); 
}

/* --------------------------
   Modal & Event Helpers
   -------------------------- */
function openEventModal(slot) { 
    currentSelectedSlot = slot; 
    const modal = document.getElementById('eventModal'); 
    const isEvenOddEnabled = localStorage.getItem('isEvenOddEnabled') === 'true';
    const weekContainer = document.getElementById('weekTypeContainer');
    if(weekContainer) {
        if(isEvenOddEnabled) weekContainer.classList.remove('hidden');
        else weekContainer.classList.add('hidden');
    }
    const hour = parseInt(slot.dataset.hour);
    const rawData = localStorage.getItem(`schedule-${slot.dataset.day}-${hour}`);
    let data = { subject: "", start: `${hour.toString().padStart(2,'0')}:00`, end: `${(hour+1).toString().padStart(2,'0')}:00`, location: "", type: "", teacher: "", color: "#F3F4F6", weekType: "every" };
    if (rawData) data = parseSlotData(rawData, hour);

    document.getElementById('eventInput').value = data.subject;
    document.getElementById('startTimeInput').value = data.start;
    document.getElementById('endTimeInput').value = data.end;
    document.getElementById('locationInput').value = data.location;
    document.getElementById('eventTypeInput').value = data.type;
    document.getElementById('eventTeacherInput').value = data.teacher;
    document.getElementById('selectedColorInput').value = data.color;
    document.getElementById('weekTypeInput').value = data.weekType;

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.remove('ring-offset-2', 'ring-gray-400', 'scale-110');
        btn.classList.add('ring-transparent');
        if(btn.dataset.color === data.color) { btn.classList.remove('ring-transparent'); btn.classList.add('ring-offset-2', 'ring-gray-400', 'scale-110'); }
    });
    document.querySelectorAll('.week-type-btn').forEach(btn => {
        if(btn.dataset.val === data.weekType) { btn.className = "week-type-btn flex-1 py-1 text-xs font-bold rounded shadow-sm bg-white dark:bg-gray-600 text-primary transition"; } 
        else { btn.className = "week-type-btn flex-1 py-1 text-xs font-bold rounded text-gray-500 hover:text-gray-700 transition"; }
    });
    modal.classList.remove('hidden'); modal.classList.add('flex'); document.getElementById('eventInput').focus(); 
}

function closeEventModal() { document.getElementById('eventModal').classList.add('hidden'); document.getElementById('eventModal').classList.remove('flex'); currentSelectedSlot = null; }

function saveEventFromModal() {
    if (!currentSelectedSlot) return;
    const subject = document.getElementById('eventInput').value.trim().toUpperCase();
    if (subject === "") { deleteEventFromModal(); return; }
    const start = document.getElementById('startTimeInput').value;
    const end = document.getElementById('endTimeInput').value;
    const loc = document.getElementById('locationInput').value.trim();
    const type = document.getElementById('eventTypeInput').value;
    const teacher = document.getElementById('eventTeacherInput').value.trim();
    const color = document.getElementById('selectedColorInput').value;
    const weekType = document.getElementById('weekTypeInput').value;

    let colorMap = JSON.parse(localStorage.getItem('subjectColors') || '{}');
    colorMap[subject] = color;
    localStorage.setItem('subjectColors', JSON.stringify(colorMap));

    const eventData = { subject, start, end, location: loc, type, teacher, color, weekType };
    const key = `schedule-${currentSelectedSlot.dataset.day}-${currentSelectedSlot.dataset.hour}`;
    localStorage.setItem(key, JSON.stringify(eventData));
    closeEventModal(); refreshAllViews();
}

function deleteEventFromModal() {
    if (!currentSelectedSlot) return;
    const key = `schedule-${currentSelectedSlot.dataset.day}-${currentSelectedSlot.dataset.hour}`;
    localStorage.removeItem(key); closeEventModal(); refreshAllViews();
}

/* --------------------------
   TODO LOGIC (Mobile Click Fix & Dot Placement)
   -------------------------- */
function toggleModalPinState() {
    const input = document.getElementById('todoPinnedInput');
    const icon = document.getElementById('todoModalPinIcon');
    const btn = document.getElementById('todoModalPinBtn');
    
    const isPinned = input.value === 'true';
    input.value = !isPinned; 
    
    if(!isPinned) {
        icon.style.fontVariationSettings = "'FILL' 1"; 
        btn.classList.add('text-primary');
        btn.classList.remove('text-gray-400');
    } else {
        icon.style.fontVariationSettings = "'FILL' 0";
        btn.classList.remove('text-primary');
        btn.classList.add('text-gray-400');
    }
}

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
    editingTodoId = null;
    document.getElementById('todoModalTitle').innerText = "New Task";
    document.getElementById('todoModalNameInput').value = text; 
    document.getElementById('todoDateInput').value = '';
    
    document.getElementById('todoPinnedInput').value = 'true'; 
    toggleModalPinState(); // Reset pin to false

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
    } else { document.getElementById('todoDateInput').value = ''; }
    
    // Pin State
    const isPinned = todo.pinned === true;
    document.getElementById('todoPinnedInput').value = (!isPinned).toString(); 
    toggleModalPinState(); 
    
    // Priority
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
    const isPinned = document.getElementById('todoPinnedInput').value === 'true';

    let priority = 'med';
    const selectedP = document.querySelector('.p-btn.selected');
    if(selectedP) priority = selectedP.dataset.priority;
    const todos = JSON.parse(localStorage.getItem('advancedTodos') || '[]');

    let existingNote = "";
    if (editingTodoId) {
        const index = todos.findIndex(t => t.id == editingTodoId);
        if (index > -1) existingNote = todos[index].note || "";
    }

    if (editingTodoId) {
        const index = todos.findIndex(t => t.id == editingTodoId);
        if (index > -1) {
            todos[index].text = nameVal;
            todos[index].pinned = isPinned;
            todos[index].note = existingNote;
            todos[index].deadlineISO = deadlineObj ? deadlineObj.toISOString() : "";
            todos[index].deadlineText = deadlineObj ? deadlineObj.toLocaleString('en-US', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : "No Deadline";
            todos[index].priority = priority;
        }
    } else {
        const todoObj = { id: Date.now(), text: nameVal, note: "", pinned: isPinned, deadlineISO: deadlineObj ? deadlineObj.toISOString() : "", deadlineText: deadlineObj ? deadlineObj.toLocaleString('en-US', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : "No Deadline", priority: priority };
        todos.push(todoObj);
    }
    saveTodos(todos); renderTodos(todos); closeTodoModal(); document.getElementById('todoInput').value = ''; 
}

function closeTodoModal() { document.getElementById('todoModal').classList.add('hidden'); document.getElementById('todoModal').classList.remove('flex'); }
function saveTodos(todos) { localStorage.setItem('advancedTodos', JSON.stringify(todos)); }
function loadTodos() { renderTodos(JSON.parse(localStorage.getItem('advancedTodos') || '[]')); }

function renderTodos(todos) {
    const list = document.getElementById('todoList');
    list.innerHTML = '';
    let filteredTodos = todos;
    if (currentFilter === 'today') { const todayStr = new Date().toDateString(); filteredTodos = todos.filter(t => { if (!t.deadlineISO) return false; return new Date(t.deadlineISO).toDateString() === todayStr; }); }
    else if (currentFilter === 'upcoming') { const today = new Date(); today.setHours(0,0,0,0); filteredTodos = todos.filter(t => { if (!t.deadlineISO) return false; const d = new Date(t.deadlineISO); d.setHours(0,0,0,0); return d > today; }); }
    
    // Sort: Pinned -> Priority -> Date
    filteredTodos.sort((a,b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const pVal = { high: 3, med: 2, low: 1 };
        const pDiff = pVal[b.priority] - pVal[a.priority];
        if (pDiff !== 0) return pDiff;
        const tA = a.deadlineISO ? new Date(a.deadlineISO).getTime() : 9999999999999;
        const tB = b.deadlineISO ? new Date(b.deadlineISO).getTime() : 9999999999999;
        return tA - tB;
    });

    if (filteredTodos.length === 0) { list.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm italic animate-fade-in">No tasks found.</div>`; return; }
    filteredTodos.forEach((t, index) => createTodoElement(t, list, index));
}

function createTodoElement(todoObj, container, index = 0) {
    const div = document.createElement('div');
    // Mobile Reveal Logic: Row click = toggle active
    div.className = "task-item group relative flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer mb-2 transform hover:-translate-y-0.5 hover:shadow-md";
    
    if (todoObj.pinned) {
        div.classList.add("task-pinned", "border-l-4"); // New class defined in style.css
        div.classList.remove("border-gray-100", "dark:border-gray-700"); 
    }

    div.addEventListener('click', (e) => {
        const isActive = div.classList.contains('active');
        document.querySelectorAll('.task-item.active').forEach(el => el.classList.remove('active'));
        if (!isActive) div.classList.add('active');
    });

    const delay = Math.min(index * 0.05, 0.5);
    div.style.animationDelay = `${delay}s`;
    div.dataset.id = todoObj.id; 
    
    let dotColor = 'bg-yellow-500'; 
    if(todoObj.priority === 'high') dotColor = 'bg-red-500'; 
    if(todoObj.priority === 'low') dotColor = 'bg-green-500';
    
    const hasNote = todoObj.note && todoObj.note.trim().length > 0;
    const noteIconColor = hasNote ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600';

    div.innerHTML = `
        <div class="flex items-center gap-3 flex-1 min-w-0">
             ${todoObj.pinned ? `<span class="material-symbols-outlined text-xs text-primary -mr-1 rotate-45">keep</span>` : ''}
            
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate leading-snug select-text">${escapeHtml(todoObj.text)}</p>
                <div class="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                    <span>${todoObj.deadlineText}</span>
                    <span class="hidden countdown-timer font-mono text-primary font-bold"></span>
                </div>
            </div>
        </div>
        
        <div class="flex items-center gap-2 shrink-0">
             <div class="flex items-center gap-1 pl-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-[.active]:opacity-100 group-[.active]:pointer-events-auto transition-all duration-200">
                <button class="note-btn p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition ${noteIconColor}" title="View/Edit Note">
                    <span class="material-symbols-outlined text-lg">description</span>
                </button>
                <button class="edit-btn text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded-md transition" title="Edit Task">
                    <span class="material-symbols-outlined text-lg">edit</span>
                </button>
                <button class="delete-btn text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition" title="Delete">
                    <span class="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>
            
            <div class="w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 ring-2 ring-white dark:ring-gray-700 shadow-sm ml-1"></div>
        </div>
    `;

    // Bind Events
    div.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); initiateEditTodo(todoObj.id); });
    div.querySelector('.note-btn').addEventListener('click', (e) => { e.stopPropagation(); openNoteModal(todoObj.id); });
    div.querySelector('.delete-btn').addEventListener('click', (e) => { 
        e.stopPropagation(); 
        askDeleteTodo(todoObj.id); 
    });
    
    container.appendChild(div);
}

/* --------------------------
   DELETE MODAL LOGIC
   -------------------------- */
function askDeleteTodo(id) {
    todoToDeleteId = id;
    const modal = document.getElementById('deleteModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    todoToDeleteId = null;
}

function confirmDeleteTodo() {
    if(todoToDeleteId) {
        let todos = JSON.parse(localStorage.getItem('advancedTodos'));
        todos = todos.filter(t => t.id != todoToDeleteId);
        saveTodos(todos);
        renderTodos(todos);
    }
    closeDeleteModal();
}

/* --------------------------
   NOTE MODAL LOGIC
   -------------------------- */
let currentNoteTodoId = null;
function openNoteModal(id) {
    const todos = JSON.parse(localStorage.getItem('advancedTodos') || '[]');
    const todo = todos.find(t => t.id == id);
    if (!todo) return;
    currentNoteTodoId = id;
    const noteInput = document.getElementById('noteInput');
    noteInput.value = todo.note || "";
    const modal = document.getElementById('noteModal');
    modal.classList.remove('hidden'); modal.classList.add('flex'); noteInput.focus();
}
function closeNoteModal() { document.getElementById('noteModal').classList.add('hidden'); document.getElementById('noteModal').classList.remove('flex'); currentNoteTodoId = null; }
function saveNoteFromModal() {
    if (!currentNoteTodoId) return;
    const noteVal = document.getElementById('noteInput').value.trim();
    const todos = JSON.parse(localStorage.getItem('advancedTodos') || '[]');
    const index = todos.findIndex(t => t.id == currentNoteTodoId);
    if (index > -1) { todos[index].note = noteVal; saveTodos(todos); renderTodos(todos); }
    closeNoteModal();
}

function updateCountdowns() {
    const now = new Date();
    document.querySelectorAll('#todoList > div').forEach(div => {
        const iso = div.dataset.deadlineIso; const timerSpan = div.querySelector('.countdown-timer');
        if(!iso || !timerSpan) return;
        const diff = new Date(iso) - now;
        if(diff <= 0) { timerSpan.innerText = "Overdue"; timerSpan.classList.remove('hidden'); timerSpan.classList.add('text-red-500'); }
        else { timerSpan.classList.remove('hidden'); timerSpan.classList.remove('text-red-500'); const oneDay = 86400000; if (diff > oneDay) { const d = Math.floor(diff / oneDay); const h = Math.floor((diff % oneDay) / 3600000); timerSpan.innerText = `${d}d ${h}h`; } else { const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); timerSpan.innerText = `${h}h ${m}m`; } }
    });
}
function toggleCalendarView() {
    const monthView = document.getElementById('monthView'); const weekView = document.getElementById('weekView'); const btnText = document.getElementById('toggleBtnText'); const nav = document.getElementById('monthNav'); const title = document.getElementById('calendarTitle'); const downloadBtn = document.getElementById('downloadScheduleBtn'); 
    if (monthView.classList.contains('hidden')) { monthView.classList.remove('hidden'); weekView.classList.add('hidden'); weekView.classList.remove('flex'); btnText.innerText = "Edit"; nav.classList.remove('hidden'); title.innerText = "Class Schedule"; downloadBtn.classList.add('hidden'); downloadBtn.classList.remove('flex'); renderMonthCalendar(); } 
    else { monthView.classList.add('hidden'); weekView.classList.remove('hidden'); weekView.classList.add('flex'); btnText.innerText = "Back"; nav.classList.add('hidden'); title.innerText = "Weekly Editor"; downloadBtn.classList.remove('hidden'); downloadBtn.classList.add('flex'); }
}
function refreshAllViews() { initCalendar(); renderMonthCalendar(); const dayIndex = currentOverviewDate.getDay() === 0 ? 6 : currentOverviewDate.getDay() - 1; showDailyOverview(dayIndex, currentOverviewDate); }
function renderMonthCalendar() {
    const grid = document.getElementById('monthGrid'); const monthLabel = document.getElementById('currentMonthLabel'); grid.innerHTML = ""; const year = navDate.getFullYear(); const month = navDate.getMonth(); monthLabel.innerText = new Date(year, month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate(); for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const dayDiv = document.createElement('div'); dayDiv.className = "month-day text-gray-700 dark:text-gray-300"; dayDiv.innerText = d;
        if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) { dayDiv.classList.add('today'); }
        if (currentOverviewDate && d === currentOverviewDate.getDate() && month === currentOverviewDate.getMonth() && year === currentOverviewDate.getFullYear()) { dayDiv.classList.add('selected-day'); }
        let dayOfWeek = new Date(year, month, d).getDay(); let arrayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; let hasClass = false;
        for (let h = startHour; h <= endHour; h++) { if (localStorage.getItem(`schedule-${arrayIndex}-${h}`)) hasClass = true; }
        if (hasClass) { const dot = document.createElement('div'); dot.className = "class-dot"; dayDiv.appendChild(dot); }
        dayDiv.addEventListener('click', () => { document.querySelectorAll('.month-day').forEach(el => el.classList.remove('selected-day')); dayDiv.classList.add('selected-day'); currentOverviewDate = new Date(year, month, d); showDailyOverview(arrayIndex, currentOverviewDate); });
        grid.appendChild(dayDiv);
    }
}
const ANALYTICS_NAMESPACE = 'studentdash_v1_public_tracker'; const ANALYTICS_KEY = 'visits';
document.addEventListener('DOMContentLoaded', () => { trackVisit(); const aboutBtn = document.getElementById('setBtnAbout'); if (aboutBtn) { aboutBtn.addEventListener('click', fetchVisitReport); } });
function trackVisit() { if (sessionStorage.getItem('visit_counted')) return; fetch(`https://api.counterapi.dev/v1/${ANALYTICS_NAMESPACE}/${ANALYTICS_KEY}/up`).then(res => res.json()).then(data => { updateAnalyticsUI(data.count); sessionStorage.setItem('visit_counted', 'true'); }).catch(err => console.warn("Analytics Error:", err)); }
function fetchVisitReport() { const display = document.getElementById('analyticsTotalVisits'); if (!display) return; display.innerText = "..."; fetch(`https://api.counterapi.dev/v1/${ANALYTICS_NAMESPACE}/${ANALYTICS_KEY}/`).then(res => res.json()).then(data => { updateAnalyticsUI(data.count); }).catch(err => { display.innerText = "N/A"; }); }
function updateAnalyticsUI(count) { const display = document.getElementById('analyticsTotalVisits'); if (display) { display.innerText = new Intl.NumberFormat().format(count); } }
