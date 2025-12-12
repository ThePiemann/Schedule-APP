/* src/script/tasks.js */
import { userData, saveUserData } from './store.js';

let editingTodoId = null;
let currentFilter = 'all';
let todoToDeleteId = null;

// --- INITIALIZATION ---
export function initTasks() {
    safeAddClick('addTodoBtn', initiateAddTodo);
    document.getElementById('todoInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') initiateAddTodo(); });
    
    safeAddClick('cancelTodoBtn', closeTodoModal); 
    safeAddClick('saveTodoDetailsBtn', finalizeAddTodo);
    
    document.getElementById('filterAllBtn')?.addEventListener('click', () => setFilter('all'));
    document.getElementById('filterTodayBtn')?.addEventListener('click', () => setFilter('today'));
    document.getElementById('filterUpcomingBtn')?.addEventListener('click', () => setFilter('upcoming'));

    safeAddClick('closeNoteBtn', closeNoteModal);
    safeAddClick('saveNoteBtn', saveNoteFromModal);
    safeAddClick('cancelDeleteBtn', closeDeleteModal);
    safeAddClick('confirmDeleteBtn', confirmDeleteTodo);
    safeAddClick('todoModalPinBtn', toggleModalPinState);

    // Priority Buttons
    document.querySelectorAll('.p-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected', 'ring-2', 'ring-primary'));
            e.currentTarget.classList.add('selected', 'ring-2', 'ring-primary');
        });
    });
}

// --- RENDERING ---
export function renderTodos() {
    const list = document.getElementById('todoList');
    if(!list) return;
    list.innerHTML = '';
    
    let todos = userData.advancedTodos || [];
    let filteredTodos = todos;

    if (currentFilter === 'today') { 
        const todayStr = new Date().toDateString(); 
        filteredTodos = todos.filter(t => { if (!t.deadlineISO) return false; return new Date(t.deadlineISO).toDateString() === todayStr; }); 
    }
    else if (currentFilter === 'upcoming') { 
        const today = new Date(); today.setHours(0,0,0,0); 
        filteredTodos = todos.filter(t => { if (!t.deadlineISO) return false; const d = new Date(t.deadlineISO); d.setHours(0,0,0,0); return d > today; }); 
    }
    
    // Sort
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
    div.className = "task-item group relative flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer mb-2 transform hover:-translate-y-0.5 hover:shadow-md";
    
    if (todoObj.pinned) {
        div.classList.add("task-pinned", "border-l-4"); 
        div.classList.remove("border-gray-100", "dark:border-gray-700"); 
    }

    div.addEventListener('click', () => {
        const isActive = div.classList.contains('active');
        document.querySelectorAll('.task-item.active').forEach(el => el.classList.remove('active'));
        if (!isActive) div.classList.add('active');
    });

    const delay = Math.min(index * 0.05, 0.5);
    div.style.animationDelay = `${delay}s`;
    
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
                <button class="note-btn p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition ${noteIconColor}"><span class="material-symbols-outlined text-lg">description</span></button>
                <button class="edit-btn text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded-md transition"><span class="material-symbols-outlined text-lg">edit</span></button>
                <button class="delete-btn text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition"><span class="material-symbols-outlined text-lg">delete</span></button>
            </div>
            <div class="w-2.5 h-2.5 rounded-full ${dotColor} shrink-0 ring-2 ring-white dark:ring-gray-700 shadow-sm ml-1"></div>
        </div>
    `;

    div.querySelector('.edit-btn').addEventListener('click', (e) => { e.stopPropagation(); initiateEditTodo(todoObj.id); });
    div.querySelector('.note-btn').addEventListener('click', (e) => { e.stopPropagation(); openNoteModal(todoObj.id); });
    div.querySelector('.delete-btn').addEventListener('click', (e) => { e.stopPropagation(); askDeleteTodo(todoObj.id); });
    
    div.dataset.deadlineIso = todoObj.deadlineISO; // For timer
    container.appendChild(div);
}

export function updateCountdowns() {
    const now = new Date();
    document.querySelectorAll('#todoList > div').forEach(div => {
        const iso = div.dataset.deadlineIso; const timerSpan = div.querySelector('.countdown-timer');
        if(!iso || !timerSpan) return;
        const diff = new Date(iso) - now;
        if(diff <= 0) { timerSpan.innerText = "Overdue"; timerSpan.classList.remove('hidden'); timerSpan.classList.add('text-red-500'); }
        else { 
            timerSpan.classList.remove('hidden'); timerSpan.classList.remove('text-red-500'); 
            const oneDay = 86400000; 
            if (diff > oneDay) { 
                const d = Math.floor(diff / oneDay); const h = Math.floor((diff % oneDay) / 3600000); 
                timerSpan.innerText = `${d}d ${h}h`; 
            } else { 
                const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000); 
                timerSpan.innerText = `${h}h ${m}m`; 
            } 
        }
    });
}

// --- HELPERS ---
function setFilter(type) {
    currentFilter = type;
    const btns = { all: 'filterAllBtn', today: 'filterTodayBtn', upcoming: 'filterUpcomingBtn' };
    const activeClass = "px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold transition-colors";
    const inactiveClass = "px-4 py-1 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium transition-colors";
    
    Object.keys(btns).forEach(key => {
        const btn = document.getElementById(btns[key]);
        if(btn) btn.className = (key === type) ? activeClass : inactiveClass;
    });
    renderTodos();
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
    const todos = userData.advancedTodos;
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
    
    const isPinned = todo.pinned === true;
    document.getElementById('todoPinnedInput').value = (!isPinned).toString(); 
    toggleModalPinState(); 
    
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
    
    const todos = userData.advancedTodos;
    let existingNote = "";
    
    if (editingTodoId) {
        const index = todos.findIndex(t => t.id == editingTodoId);
        if (index > -1) {
            existingNote = todos[index].note || "";
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
    
    userData.advancedTodos = todos;
    saveUserData();
    renderTodos(); 
    closeTodoModal(); 
    document.getElementById('todoInput').value = ''; 
}

function closeTodoModal() { document.getElementById('todoModal').classList.add('hidden'); document.getElementById('todoModal').classList.remove('flex'); }

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

function askDeleteTodo(id) { todoToDeleteId = id; const modal = document.getElementById('deleteModal'); modal.classList.remove('hidden'); modal.classList.add('flex'); }
function closeDeleteModal() { document.getElementById('deleteModal').classList.add('hidden'); document.getElementById('deleteModal').classList.remove('flex'); todoToDeleteId = null; }
function confirmDeleteTodo() {
    if(todoToDeleteId) {
        userData.advancedTodos = userData.advancedTodos.filter(t => t.id != todoToDeleteId);
        renderTodos();
        saveUserData();
    }
    closeDeleteModal();
}

let currentNoteTodoId = null;
function openNoteModal(id) {
    const todo = userData.advancedTodos.find(t => t.id == id);
    if (!todo) return;
    currentNoteTodoId = id;
    document.getElementById('noteInput').value = todo.note || "";
    const modal = document.getElementById('noteModal');
    modal.classList.remove('hidden'); modal.classList.add('flex');
}
function closeNoteModal() { document.getElementById('noteModal').classList.add('hidden'); document.getElementById('noteModal').classList.remove('flex'); currentNoteTodoId = null; }
function saveNoteFromModal() {
    if (!currentNoteTodoId) return;
    const noteVal = document.getElementById('noteInput').value.trim();
    const index = userData.advancedTodos.findIndex(t => t.id == currentNoteTodoId);
    if (index > -1) { 
        userData.advancedTodos[index].note = noteVal; 
        saveUserData(); 
        renderTodos(); 
    }
    closeNoteModal();
}

function safeAddClick(id, fn) { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); }
function escapeHtml(str) { if (!str) return ''; return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }