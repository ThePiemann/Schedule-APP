/* src/script/script.js */

import { auth, onAuthStateChanged } from './auth.js';
import { loadUserData, setCurrentUser, appState } from './store.js';
import { initCalendar, renderMonthCalendar, showDailyOverview, setupCalendarListeners } from './calendar.js';
import { initTasks, renderTodos, updateCountdowns } from './tasks.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            setCurrentUser(user);
            console.log("Logged in as:", user.email);
            // Load data, then refresh UI
            loadUserData(() => {
                refreshAllViews();
            });
        } else {
            // Redirect to login if not authenticated
            if (!window.location.pathname.includes('login.html')) {
                window.location.href = 'login.html';
            }
        }
    });

    // 2. Initial Render (Empty state before data loads)
    initCalendar();
    initWeekCounter();
    renderMonthCalendar();
    
    // 3. Setup All Listeners (This fixes the Task Modal)
    setupCalendarListeners();
    initTasks(); // <--- This attaches the Add Task button events
    if (typeof setupPdfListeners === "function") setupPdfListeners();

    // 4. Time & Timers
    updateDateTime();
    setInterval(() => {
        updateDateTime();
        updateCountdowns();
    }, 1000);
});

/* UI Helpers */
function updateDateTime() {
    const d = document.getElementById('datetimeDisplay');
    if(d) d.innerText = new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' });
}

function refreshAllViews() {
    initCalendar();
    renderMonthCalendar();
    initWeekCounter();
    
    const todayIndex = new Date().getDay(); 
    const gridIndex = todayIndex === 0 ? 6 : todayIndex - 1;
    showDailyOverview(gridIndex, new Date());
    
    renderTodos();
}

function initWeekCounter() {
    // This is now handled in store.js / script.js, making it global for settings.js to use
    const div = document.getElementById('weekDisplay');
    if(!div) return;
    
    // We import userData indirectly via store state if needed, 
    // but for now let's rely on the store's data being loaded.
    // Ideally this logic should be imported or passed, but keeping it simple:
    import('./store.js').then(module => {
        const settings = module.userData.settings || {};
        const showCounter = settings['showWeekCounter'] === 'true';
        
        if (!showCounter) { div.classList.add('hidden'); return; }
        div.classList.remove('hidden');
        
        const d = new Date();
        let weekNum = Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7);
        weekNum += 1; 
        
        const invert = settings['weekParityInvert'] === 'true';
        let isEven = (weekNum % 2 === 0);
        if (invert) isEven = !isEven;
        
        module.appState.isEvenWeek = isEven; 
        div.innerText = isEven ? "Week: EVEN" : "Week: ODD";
        div.className = "week-badge text-xs font-bold px-3 py-1 rounded transition-colors";
    });
}

window.initWeekCounter = initWeekCounter;