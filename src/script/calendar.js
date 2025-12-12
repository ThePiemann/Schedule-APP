/* src/script/calendar.js */
import { userData, saveUserData, parseSlotData, appState } from './store.js';

const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const startHour = 7;
const endHour = 20;
let currentSelectedSlot = null;
let navDate = new Date(); 
let currentOverviewDate = new Date(); 

export function initCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    // Headers
    const timeHeader = document.createElement('div'); timeHeader.className = 'header-cell'; timeHeader.innerText = 'TIME'; grid.appendChild(timeHeader);
    days.forEach(day => { const dh = document.createElement('div'); dh.className = 'header-cell'; dh.innerText = day; grid.appendChild(dh); });
    
    // Grid
    let gridDelayCounter = 0; 
    for (let hour = startHour; hour <= endHour; hour++) {
        const tLabel = document.createElement('div'); tLabel.className = 'time-label'; tLabel.innerText = `${hour}:00`; grid.appendChild(tLabel);
        days.forEach((d, index) => {
            const slot = document.createElement('div'); 
            slot.className = 'slot group'; 
            slot.dataset.day = index; 
            slot.dataset.hour = hour;
            
            // Drag Events
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('dragenter', handleDragEnter);
            slot.addEventListener('dragleave', handleDragLeave);
            slot.addEventListener('drop', handleDrop);
            
            slot.addEventListener('click', (e) => {
                if(slot.classList.contains('just-dropped')) { slot.classList.remove('just-dropped'); return; }
                openEventModal(slot);
            });
            
            // Populate Data
            const rawData = userData.schedule[`schedule-${index}-${hour}`];
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

export function renderMonthCalendar() {
    const grid = document.getElementById('monthGrid'); 
    const monthLabel = document.getElementById('currentMonthLabel'); 
    if(!grid) return;
    
    grid.innerHTML = ""; 
    const year = navDate.getFullYear(); 
    const month = navDate.getMonth(); 
    
    if(monthLabel) monthLabel.innerText = new Date(year, month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); 
    
    const firstDay = new Date(year, month, 1).getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate(); 
    const today = new Date();

    for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
    
    for (let d = 1; d <= daysInMonth; d++) {
        const dayDiv = document.createElement('div'); dayDiv.className = "month-day text-gray-700 dark:text-gray-300"; dayDiv.innerText = d;
        if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) { dayDiv.classList.add('today'); }
        
        let dayOfWeek = new Date(year, month, d).getDay(); 
        let arrayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
        
        // Dot indicator
        let hasClass = false;
        for (let h = startHour; h <= endHour; h++) { if (userData.schedule[`schedule-${arrayIndex}-${h}`]) hasClass = true; }
        if (hasClass) { const dot = document.createElement('div'); dot.className = "class-dot"; dayDiv.appendChild(dot); }
        
        dayDiv.addEventListener('click', () => { 
            document.querySelectorAll('.month-day').forEach(el => el.classList.remove('selected-day')); 
            dayDiv.classList.add('selected-day'); 
            currentOverviewDate = new Date(year, month, d); 
            showDailyOverview(arrayIndex, currentOverviewDate); 
        });
        grid.appendChild(dayDiv);
    }
}

export function showDailyOverview(dayIndex, dateObj) {
    currentOverviewDate = dateObj; 
    const container = document.getElementById('dailyOverview');
    const label = document.getElementById('overviewDateLabel');
    if(!container) return;
    container.innerHTML = "";
    if(dateObj) label.innerText = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric'});
    
    let hasClass = false;
    let delayCounter = 0; 
    for (let h = startHour; h <= endHour; h++) {
        const rawData = userData.schedule[`schedule-${dayIndex}-${h}`];
        if (rawData) {
            const data = parseSlotData(rawData, h);
            
            // Even/Odd Week Filter
            if (data.weekType === 'even' && !appState.isEvenWeek) continue;
            if (data.weekType === 'odd' && appState.isEvenWeek) continue;

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

export function toggleCalendarView() {
    const monthView = document.getElementById('monthView'); 
    const weekView = document.getElementById('weekView'); 
    const btnText = document.getElementById('toggleBtnText'); 
    const nav = document.getElementById('monthNav'); 
    const title = document.getElementById('calendarTitle'); 
    const downloadBtn = document.getElementById('downloadScheduleBtn'); 
    
    if (monthView.classList.contains('hidden')) { 
        monthView.classList.remove('hidden'); weekView.classList.add('hidden'); weekView.classList.remove('flex'); 
        btnText.innerText = "Edit"; nav.classList.remove('hidden'); title.innerText = "Class Schedule"; 
        downloadBtn.classList.add('hidden'); downloadBtn.classList.remove('flex'); 
        renderMonthCalendar(); 
    } else { 
        monthView.classList.add('hidden'); weekView.classList.remove('hidden'); weekView.classList.add('flex'); 
        btnText.innerText = "Back"; nav.classList.add('hidden'); title.innerText = "Weekly Editor"; 
        downloadBtn.classList.remove('hidden'); downloadBtn.classList.add('flex'); 
    }
}

// --- SETUP LISTENERS ---
export function setupCalendarListeners() {
    document.getElementById('toggleViewBtn')?.addEventListener('click', toggleCalendarView);
    document.getElementById('prevMonth')?.addEventListener('click', () => { navDate.setMonth(navDate.getMonth() - 1); renderMonthCalendar(); });
    document.getElementById('nextMonth')?.addEventListener('click', () => { navDate.setMonth(navDate.getMonth() + 1); renderMonthCalendar(); });
    
    document.getElementById('closeEventModal')?.addEventListener('click', closeEventModal);
    document.getElementById('saveEventBtn')?.addEventListener('click', saveEventFromModal);
    document.getElementById('deleteEventBtn')?.addEventListener('click', deleteEventFromModal);
    document.getElementById('eventInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveEventFromModal(); });
    
    // Modal Helpers
    setupModalInputs();
}

function setupModalInputs() {
    const colorBtns = document.querySelectorAll('.color-btn');
    colorBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            colorBtns.forEach(b => { b.classList.remove('ring-offset-2', 'ring-gray-400', 'scale-110'); b.classList.add('ring-transparent'); });
            e.target.classList.remove('ring-transparent'); e.target.classList.add('ring-offset-2', 'ring-gray-400', 'scale-110');
            document.getElementById('selectedColorInput').value = e.target.dataset.color;
        });
    });
    const weekBtns = document.querySelectorAll('.week-type-btn');
    weekBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            weekBtns.forEach(b => b.className = "week-type-btn flex-1 py-1 text-xs font-bold rounded text-gray-500 hover:text-gray-700 transition");
            e.target.className = "week-type-btn flex-1 py-1 text-xs font-bold rounded shadow-sm bg-white dark:bg-gray-600 text-primary transition";
            document.getElementById('weekTypeInput').value = e.target.dataset.val;
        });
    });
}

// --- DRAG & DROP & EVENT MODAL LOGIC ---
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
    
    const sourceRaw = userData.schedule[sourceKey]; 
    let sourceObj = sourceRaw ? parseSlotData(sourceRaw, parseInt(sourcePos.hour)) : null;
    let targetObj = userData.schedule[targetKey] ? parseSlotData(userData.schedule[targetKey], targetHour) : null;
    
    if (sourceObj) { sourceObj.start = `${targetHour.toString().padStart(2,'0')}:00`; sourceObj.end = `${(targetHour+1).toString().padStart(2,'0')}:00`; }
    if (targetObj) { const sHour = parseInt(sourcePos.hour); targetObj.start = `${sHour.toString().padStart(2,'0')}:00`; targetObj.end = `${(sHour+1).toString().padStart(2,'0')}:00`; }
    
    if (sourceObj) userData.schedule[targetKey] = JSON.stringify(sourceObj); else delete userData.schedule[targetKey];
    if (targetObj) userData.schedule[sourceKey] = JSON.stringify(targetObj); else delete userData.schedule[sourceKey];
    
    this.classList.add('just-dropped'); 
    initCalendar(); 
    saveUserData();
}

function openEventModal(slot) { 
    currentSelectedSlot = slot; 
    const modal = document.getElementById('eventModal'); 
    const isEvenOddEnabled = userData.settings['isEvenOddEnabled'] === 'true';
    const weekContainer = document.getElementById('weekTypeContainer');
    if(weekContainer) {
        if(isEvenOddEnabled) weekContainer.classList.remove('hidden'); else weekContainer.classList.add('hidden');
    }
    const hour = parseInt(slot.dataset.hour);
    const rawData = userData.schedule[`schedule-${slot.dataset.day}-${hour}`];
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
        btn.classList.remove('ring-offset-2', 'ring-gray-400', 'scale-110'); btn.classList.add('ring-transparent');
        if(btn.dataset.color === data.color) { btn.classList.remove('ring-transparent'); btn.classList.add('ring-offset-2', 'ring-gray-400', 'scale-110'); }
    });
    document.querySelectorAll('.week-type-btn').forEach(btn => {
        if(btn.dataset.val === data.weekType) btn.className = "week-type-btn flex-1 py-1 text-xs font-bold rounded shadow-sm bg-white dark:bg-gray-600 text-primary transition"; 
        else btn.className = "week-type-btn flex-1 py-1 text-xs font-bold rounded text-gray-500 hover:text-gray-700 transition";
    });
    modal.classList.remove('hidden'); modal.classList.add('flex'); document.getElementById('eventInput').focus(); 
}

function closeEventModal() { document.getElementById('eventModal').classList.add('hidden'); document.getElementById('eventModal').classList.remove('flex'); currentSelectedSlot = null; }

function saveEventFromModal() {
    if (!currentSelectedSlot) return;
    const subject = document.getElementById('eventInput').value.trim().toUpperCase();
    if (subject === "") { deleteEventFromModal(); return; }
    
    // Gather values
    const start = document.getElementById('startTimeInput').value;
    const end = document.getElementById('endTimeInput').value;
    const loc = document.getElementById('locationInput').value.trim();
    const type = document.getElementById('eventTypeInput').value;
    const teacher = document.getElementById('eventTeacherInput').value.trim();
    const color = document.getElementById('selectedColorInput').value;
    const weekType = document.getElementById('weekTypeInput').value;

    // Save color preference
    userData.subjectColors[subject] = color;

    const eventData = { subject, start, end, location: loc, type, teacher, color, weekType };
    const key = `schedule-${currentSelectedSlot.dataset.day}-${currentSelectedSlot.dataset.hour}`;
    userData.schedule[key] = JSON.stringify(eventData);
    
    closeEventModal(); 
    initCalendar();
    saveUserData();
}

function deleteEventFromModal() {
    if (!currentSelectedSlot) return;
    const key = `schedule-${currentSelectedSlot.dataset.day}-${currentSelectedSlot.dataset.hour}`;
    delete userData.schedule[key]; 
    closeEventModal(); 
    initCalendar();
    saveUserData();
}