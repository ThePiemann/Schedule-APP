/* --------------------------
   Global constants & state
   -------------------------- */
const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const startHour = 7;
const endHour = 20;

let currentSelectedSlot = null;
let tempTodoText = "";
let tempPriority = "med";

/* --------------------------
   Event wiring
   -------------------------- */
function setupEventListeners() {
  // --- Schedule modal controls ---
  safeAddClick('closeEventModal', closeEventModal);
  safeAddClick('saveEventBtn', saveEventFromModal);
  safeAddClick('deleteEventBtn', deleteEventFromModal);

  const eventInput = document.getElementById('eventInput');
  if (eventInput) {
    eventInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveEventFromModal(); });
  }

  // --- Todo creation controls ---
  safeAddClick('addTodoBtn', initiateAddTodo);
  const todoInput = document.getElementById('todoInput');
  if (todoInput) {
    todoInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') initiateAddTodo(); });
  }

  // --- Todo modal ---
  safeAddClick('closeTodoModal', closeTodoModal);
  safeAddClick('cancelTodoBtn', closeTodoModal);
  safeAddClick('saveTodoDetailsBtn', finalizeAddTodo);

  // Priority buttons (in modal)
  document.querySelectorAll('.p-btn').forEach(btn =>{
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
      e.currentTarget.classList.add('selected');
      tempPriority = e.currentTarget.dataset.priority || 'med';
    });
  });

  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    const evModal = document.getElementById('eventModal');
    const tdModal = document.getElementById('todoModal');
    if (evModal && e.target === evModal) closeEventModal();
    if (tdModal && e.target === tdModal) closeTodoModal();
  });

  // Close on ESC key (modals + mobile drawer)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeEventModal();
      closeTodoModal();
      closeMobileSidebar();
    }
  });

  // Theme toggle
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) themeToggle.addEventListener('change', toggleTheme);

  // Mobile drawer controls
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const backdrop = document.getElementById('mobileBackdrop');

  if (mobileBtn) {
    // give a high z-index as a safety-net in case CSS lacked it
    mobileBtn.style.zIndex = mobileBtn.style.zIndex || 2000;

    mobileBtn.addEventListener('click', () => {
      // If desktop width, don't use mobile drawer toggle
      if (window.innerWidth > 768) return;
      toggleMobileSidebar();
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      closeMobileSidebar();
    });
  }

  // Desktop toggle button
  const desktopToggle = document.getElementById('desktopToggleBtn');
  if (desktopToggle) {
    desktopToggle.addEventListener('click', () => {
      // only operate desktop toggle when viewport wide enough
      if (window.innerWidth <= 768) return;
      const app = document.querySelector('.app-container');
      if (!app) return;
      const collapsed = app.classList.toggle('sidebar-collapsed');
      localStorage.setItem('sidebarCollapsed', collapsed);
    });
  }

  // When window resizes, ensure UI state consistent
  window.addEventListener('resize', onWindowResize);
}

/* --------------------------
   Helper utilities
   -------------------------- */
function safeAddClick(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

/* --------------------------
   Theme & sidebar persistence
   -------------------------- */
function loadTheme() {
  const isDark = localStorage.getItem('isDarkMode') === 'true';
  if (isDark) document.body.classList.add('dark-mode');
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = isDark;
}

function toggleTheme() {
  const enabled = document.body.classList.toggle('dark-mode');
  localStorage.setItem('isDarkMode', enabled);
}

function loadSidebarState() {
  // restore desktop collapsed state only if on desktop
  const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  const app = document.querySelector('.app-container');
  if (!app) return;
  if (collapsed && window.innerWidth > 768) {
    app.classList.add('sidebar-collapsed');
  } else {
    app.classList.remove('sidebar-collapsed');
  }
}

/* --------------------------
   Mobile drawer controls
   -------------------------- */
function openMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('mobileBackdrop');
  if (!sidebar) return;

  sidebar.classList.add('active');
  if (backdrop) backdrop.classList.add('show');

  // lock body scroll
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const backdrop = document.getElementById('mobileBackdrop');
  if (!sidebar) return;

  sidebar.classList.remove('active');
  if (backdrop) backdrop.classList.remove('show');

  // restore body scroll
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

function toggleMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return;
  if (sidebar.classList.contains('active')) closeMobileSidebar();
  else openMobileSidebar();
}

/* --------------------------
   Window resize adjustments
   -------------------------- */
function onWindowResize() {
  // If user moves to desktop width, ensure mobile overlay is removed and sidebar restored according to stored state
  if (window.innerWidth > 768) {
    // remove mobile overlay classes
    closeMobileSidebar();

    // restore desktop collapse from localStorage
    const app = document.querySelector('.app-container');
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (app) {
      if (collapsed) app.classList.add('sidebar-collapsed');
      else app.classList.remove('sidebar-collapsed');
    }
  } else {
    // mobile view - don't keep desktop collapsed state interfering
    const app = document.querySelector('.app-container');
    if (app) app.classList.remove('sidebar-collapsed');
  }
}

function handleResizeOnStart() {
  // called right after DOMContentLoaded to set correct initial UI
  onWindowResize();
}

/* --------------------------
   Calendar / schedule logic
   -------------------------- */
function initCalendar() {
  const grid = document.getElementById('calendarGrid');
  if (!grid) return;

  // clear any existing content (idempotent)
  grid.innerHTML = '';

  // top-left time header
  const timeHeader = document.createElement('div');
  timeHeader.className = 'header-cell';
  timeHeader.innerText = 'Time';
  grid.appendChild(timeHeader);

  // day headers
  days.forEach(day => {
    const dh = document.createElement('div');
    dh.className = 'header-cell';
    dh.innerText = day;
    grid.appendChild(dh);
  });

  // time slots
  for (let hour = startHour; hour <= endHour; hour++) {
    const tLabel = document.createElement('div');
    tLabel.className = 'time-label';
    tLabel.innerText = `${hour}:00 - ${hour + 1}:00`;
    grid.appendChild(tLabel);

    days.forEach((d, index) => {
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
  if (!modal || !input || !title) return;

  title.innerText = `Edit: ${days[slot.dataset.day]} @ ${slot.dataset.hour}:00`;
  input.value = slot.innerText || '';
  modal.style.display = 'flex';
  input.focus();
}

function closeEventModal() {
  const modal = document.getElementById('eventModal');
  if (modal) modal.style.display = 'none';
  currentSelectedSlot = null;
}

function saveEventFromModal() {
  if (!currentSelectedSlot) return;
  const input = document.getElementById('eventInput');
  if (!input) return;

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
  if (!text) return '';
  const key = text.trim().toLowerCase();
  let colorMap = {};
  try {
    colorMap = JSON.parse(localStorage.getItem('subjectColors')) || {};
  } catch (e) {
    colorMap = {};
  }
  if (colorMap[key]) return colorMap[key];

  const hue = Math.floor(Math.random() * 360);
  const newColor = `hsl(${hue}, 90%, 85%)`;
  colorMap[key] = newColor;
  localStorage.setItem('subjectColors', JSON.stringify(colorMap));
  return newColor;
}

function loadSchedule() {
  const slots = document.querySelectorAll('.slot');
  slots.forEach(slot => {
    const k = `schedule-${slot.dataset.day}-${slot.dataset.hour}`;
    const saved = localStorage.getItem(k);
    if (saved) {
      slot.innerText = saved;
      slot.classList.add('filled');
      slot.style.backgroundColor = getSubjectColor(saved);
    }
  });
}

/* --------------------------
   Todo list logic
   -------------------------- */
function initiateAddTodo() {
  const input = document.getElementById('todoInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  tempTodoText = text;
  const name = document.getElementById('todoModalTaskName');
  if (name) name.innerText = `Adding: "${text}"`;

  const dateInput = document.getElementById('todoDateInput');
  if (dateInput) dateInput.value = '';

  tempPriority = 'med';
  document.querySelectorAll('.p-btn').forEach(b => b.classList.remove('selected'));
  document.querySelector('.p-btn.med')?.classList.add('selected');

  // Highlight the selected priority button
  document.querySelectorAll('.p-btn').forEach(btn => {
    btn.classList.remove('selected');
    if (btn.classList.contains('med')) btn.classList.add('selected');
  });

  const modal = document.getElementById('todoModal');
  if (modal) modal.style.display = 'flex';
}

function closeTodoModal() {
  const modal = document.getElementById('todoModal');
  if (modal) modal.style.display = 'none';
  const input = document.getElementById('todoInput');
  if (input) input.value = '';
}

function finalizeAddTodo() {
  const dateVal = document.getElementById('todoDateInput')?.value;
  const deadlineObj = dateVal ? new Date(dateVal) : null;

  const todoObj = {
    id: Date.now(),
    text: tempTodoText,
    deadlineISO: deadlineObj ? deadlineObj.toISOString() : "",
    deadlineText: deadlineObj ? deadlineObj.toLocaleString() : "No Deadline",
    priority: tempPriority || "med"
  };

  const existingTodos = getTodosFromDOM();
  existingTodos.push(todoObj);
  saveTodos(existingTodos);
  sortAndRenderTodos(existingTodos);
  closeTodoModal();
}

/* create todo DOM + attach behavior */
function createTodoElement(todoObj) {
  const list = document.getElementById('todoList');
  if (!list || !todoObj) return;

  const li = document.createElement('li');
  li.className = 'todo-item';
  li.classList.remove('p-high', 'p-med', 'p-low');
  li.classList.add(`p-${todoObj.priority}`);
  li._originalPriority = todoObj.priority;
  li.dataset.id = todoObj.id;
  li.dataset.deadlineIso = todoObj.deadlineISO || "";
  li.dataset.originalPriority = todoObj.priority;

  li.innerHTML = `
    <div class="todo-header">
      <span class="todo-title">${escapeHtml(todoObj.text)}</span>
      <div class="todo-actions">
        <button class="btn-icon info-btn" title="View Details">+</button>
        <button class="btn-icon delete-btn" title="Delete">X</button>
      </div>
    </div>
    <div class="todo-details">
      <strong>Deadline:</strong> ${escapeHtml(todoObj.deadlineText)}
      <br>
      <span class="countdown-timer">--:--:--</span>
      <br>
      <strong>Priority:</strong> ${escapeHtml((todoObj.priority || 'med').toUpperCase())}
    </div>
  `;

  // --- Priority border always on top ---
  const headerDiv = li.querySelector('.todo-header');
  if (headerDiv) {
    headerDiv.style.position = 'relative';
    headerDiv.style.zIndex = '2';
  }

  // delete button
  li.querySelector('.delete-btn')?.addEventListener('click', () => {
    const idToDelete = li.dataset.id;
    let existingTodos = getTodosFromDOM();
    existingTodos = existingTodos.filter(todo => todo.id !== idToDelete);
    saveTodos(existingTodos);
    sortAndRenderTodos(existingTodos);
  });

  // Attach toggle animation for details
  const infoBtn = li.querySelector('.info-btn');
  const detailsDiv = li.querySelector('.todo-details');
  if (infoBtn && detailsDiv) {
    infoBtn.addEventListener('click', () => {
      const expanding = !detailsDiv.classList.contains('show');
      if (expanding) {
        detailsDiv.style.height = 'auto';
        const full = detailsDiv.scrollHeight + 'px';
        detailsDiv.style.height = '0px';
        void detailsDiv.offsetWidth;
        requestAnimationFrame(() => {
          detailsDiv.classList.add('show');
          detailsDiv.style.height = full;
        });
        const onEnd = () => {
          detailsDiv.style.height = '';
          detailsDiv.removeEventListener('transitionend', onEnd);
        };
        detailsDiv.addEventListener('transitionend', onEnd);
        infoBtn.innerText = '-';
      } else {
        detailsDiv.style.height = detailsDiv.scrollHeight + 'px';
        void detailsDiv.offsetWidth;
        requestAnimationFrame(() => {
          detailsDiv.classList.remove('show');
          detailsDiv.style.height = '0px';
        });
        const onEnd = () => {
          detailsDiv.style.height = '';
          detailsDiv.removeEventListener('transitionend', onEnd);
        };
        detailsDiv.addEventListener('transitionend', onEnd);
        infoBtn.innerText = '+';
      }
    });
  }

  list.appendChild(li);
  updateCountdowns();
}

/* --------------------------
   Todo list ordering logic
   -------------------------- */

/**
 * Assigns a numerical value to priority for easy comparison.
 * High (3) > Med (2) > Low (1)
 */
function getPriorityValue(p) {
  if (p === 'high') return 3;
  if (p === 'med') return 2;
  return 1;
}

/**
 * Custom sort function for two todo objects (a and b).
 * 1. Priority (High > Med > Low)
 * 2. Deadline (Closer date first)
 * 3. No Deadline (Items without a deadline go last within their priority group)
 */
function compareTodos(a, b) {
  const pA = getPriorityValue(a.priority);
  const pB = getPriorityValue(b.priority);

  // 1. Sort by Priority (Descending)
  if (pA !== pB) {
    return pB - pA;
  }

  // 2. Sort by Deadline (Ascending)
  const dateA = a.deadlineISO ? new Date(a.deadlineISO).getTime() : 32503680000000;
  const dateB = b.deadlineISO ? new Date(b.deadlineISO).getTime() : 32503680000000;
  return dateA - dateB;
}

/**
 * Reads all current todo items from the DOM and returns them as an array of objects.
 */
function getTodosFromDOM() {
  const todos = [];
  document.querySelectorAll('.todo-item').forEach(li => {
    const title = li.querySelector('.todo-title')?.innerText || '';
    const deadlineISO = li.dataset.deadlineIso || '';
    let p = li._originalPriority || li.dataset.originalPriority || 'med';
    const deadlineText = deadlineISO ? new Date(deadlineISO).toLocaleString() : 'No Deadline';
    todos.push({
      id: li.dataset.id,
      text: title,
      deadlineText,
      deadlineISO,
      priority: p
    });
  });
  return todos;
}

/**
 * Clears the list, sorts the list using compareTodos, and re-renders them.
 */
function sortAndRenderTodos(todos) {
  const list = document.getElementById('todoList');
  if (!list) return;
  todos.sort(compareTodos);
  list.innerHTML = '';
  todos.forEach(obj => createTodoElement(obj));
}

function loadTodos() {
  const stored = localStorage.getItem('advancedTodos');
  if (!stored) return;
  try {
    let todos = JSON.parse(stored);
    if (!Array.isArray(todos)) return;
    todos = todos.map(obj => {
      if (!obj.deadlineISO && obj.deadline) {
        const d = new Date(obj.deadline);
        if (!isNaN(d)) obj.deadlineISO = d.toISOString();
      }
      if (!obj.deadlineText) obj.deadlineText = obj.deadline || 'No Deadline';
      return {
        id: obj.id || Date.now(),
        text: obj.text || '',
        deadlineISO: obj.deadlineISO || '',
        deadlineText: obj.deadlineText || 'No Deadline',
        priority: obj.priority || 'med'
      };
    });
    sortAndRenderTodos(todos);
  } catch (e) {
    console.warn('Could not parse todos from localStorage', e);
  }
}

/* Save / Load todos from localStorage */
function saveTodos(todosArray) {
  if (todosArray) {
    localStorage.setItem('advancedTodos', JSON.stringify(todosArray));
    return;
  }
  const todos = getTodosFromDOM();
  localStorage.setItem('advancedTodos', JSON.stringify(todos));
}

/* --------------------------
   Countdown timers
   -------------------------- */
function updateCountdowns() {
  const now = new Date();
  document.querySelectorAll('.todo-item').forEach(li => {
    const iso = li.dataset.deadlineIso;
    const timerSpan = li.querySelector('.countdown-timer');
    const headerDiv = li.querySelector('.todo-header');
    if (!timerSpan || !headerDiv) return;

    // Reset border style
    headerDiv.style.borderLeft = '';
    headerDiv.style.borderLeftColor = '';
    headerDiv.style.boxShadow = '';

    if (!iso) {
      timerSpan.style.display = 'none';
      li.classList.remove('p-high', 'p-med', 'p-low');
      const orig = li._originalPriority || 'med';
      li.classList.add(`p-${orig}`);
      return;
    }

    timerSpan.style.display = 'inline-flex';
    const deadline = new Date(iso);
    const diff = deadline - now;

    if (diff <= 0) {
      timerSpan.innerText = '00h:00m:00s';
      timerSpan.style.color = '#e74c3c';
      li.classList.remove('p-high', 'p-med', 'p-low');
      // Set left border to orange for overdue
      headerDiv.style.borderLeft = '8px solid #e67e22';
      headerDiv.style.boxShadow = '';
    } else {
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const hStr = String(hours).padStart(2,'0');
      const mStr = String(minutes).padStart(2,'0');
      const sStr = String(seconds).padStart(2,'0');
      timerSpan.innerText = `${hStr}h:${mStr}m:${sStr}s`;
      timerSpan.style.minWidth = '90px';
      timerSpan.style.color = '';

      if (diff <= 3600 * 1000) {
        li.classList.remove('p-high', 'p-med', 'p-low');
        li.classList.add('p-high');
        headerDiv.style.borderLeft = '';
      } else {
        li.classList.remove('p-high', 'p-med', 'p-low');
        const orig = li._originalPriority || 'med';
        li.classList.add(`p-${orig}`);
        headerDiv.style.borderLeft = '';
      }
    }
  });
}

/* --------------------------
   Week counter & datetime
   -------------------------- */
function initWeekCounter() {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const pastDays = Math.floor((today - startOfYear) / (24*60*60*1000));
  let weekNumber = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);

  if (weekNumber % 2 !== 0) weekNumber++;

  const isEven = weekNumber % 2 === 0;
  const display = document.getElementById('weekDisplay');
  if (!display) return;
  if (isEven) {
    display.innerText = 'Current Week: EVEN';
    display.style.backgroundColor = '#27ae60';
  } else {
    display.innerText = 'Current Week: ODD';
    display.style.backgroundColor = '#e67e22';
  }
}

function updateDateTime() {
  const display = document.getElementById('datetimeDisplay');
  if (!display) return;
  const now = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('en-US', dateOptions);
  const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
  display.innerHTML = `${formattedDate} | ${formattedTime}`;
}

/* --------------------------
   Utility small helpers
   -------------------------- */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

// Remove DOMContentLoaded wrapper and run initialization directly
loadTheme();
loadSidebarState();
initCalendar();
loadSchedule();
initWeekCounter();
loadTodos();
updateDateTime();

setInterval(() => {
  updateDateTime();
  updateCountdowns();
}, 1000);

setupEventListeners();
handleResizeOnStart();