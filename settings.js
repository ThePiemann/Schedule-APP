document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

function initSettings() {
    // 1. Setup Theme
    loadTheme();
    
    const themeToggle = document.getElementById('settingThemeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }

    // 2. Setup Modal Logic
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsModal');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
            settingsModal.classList.add('flex');
        });
    }

    if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            settingsModal.classList.remove('flex');
        });
    }

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
            settingsModal.classList.remove('flex');
        }
    });
}

/* --- Theme Logic Moved Here --- */
function loadTheme() {
    const isDark = localStorage.getItem('isDarkMode') === 'true';
    const html = document.documentElement;
    const toggle = document.getElementById('settingThemeToggle');
    
    if (isDark) { 
        html.classList.add('dark'); 
        if (toggle) toggle.checked = true; 
    } else {
        html.classList.remove('dark'); 
        if (toggle) toggle.checked = false; 
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('isDarkMode', isDark);
}