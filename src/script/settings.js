document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

function initSettings() {
    // 1. Setup Theme
    loadTheme();
    
    // 2. Setup Account Data (Pictures & Names)
    initAccountSettings();
    
    const themeToggle = document.getElementById('settingThemeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }

    // 3. Setup Modal Logic
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsModal');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            // Reset to Account tab on open
            switchSettingsTab('Account');
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

    // 4. Setup Sidebar Navigation logic
    setupSettingsNavigation();
}

function setupSettingsNavigation() {
    const tabs = ['Account', 'Notifications', 'Theme', 'About'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`setBtn${tab}`);
        if (btn) {
            btn.addEventListener('click', () => switchSettingsTab(tab));
        }
    });
}

function switchSettingsTab(activeTabName) {
    const tabs = ['Account', 'Notifications', 'Theme', 'About'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`setBtn${tab}`);
        const section = document.getElementById(`setSection${tab}`);
        
        if (tab === activeTabName) {
            if(btn) btn.classList.add('active');
            if(section) section.classList.remove('hidden');
        } else {
            if(btn) btn.classList.remove('active');
            if(section) section.classList.add('hidden');
        }
    });
}

/* --- Account Settings Logic --- */
function initAccountSettings() {
    const firstNameInput = document.getElementById('firstNameInput');
    const lastNameInput = document.getElementById('lastNameInput');
    const uploadBtn = document.getElementById('uploadProfileBtn');
    const removeBtn = document.getElementById('removeProfileBtn');
    const fileInput = document.getElementById('uploadProfileInput');
    const imgElement = document.getElementById('currentProfileImg');
    const iconElement = document.getElementById('defaultProfileIcon');

    // Load saved data
    const savedFirst = localStorage.getItem('userFirstName');
    const savedLast = localStorage.getItem('userLastName');
    const savedImage = localStorage.getItem('userProfileImage');

    if (savedFirst && firstNameInput) firstNameInput.value = savedFirst;
    if (savedLast && lastNameInput) lastNameInput.value = savedLast;

    if (savedImage && imgElement && iconElement) {
        imgElement.src = savedImage;
        imgElement.classList.remove('hidden');
        iconElement.classList.add('hidden');
    }

    // Event Listener: Save Names on Change
    if (firstNameInput) {
        firstNameInput.addEventListener('input', (e) => localStorage.setItem('userFirstName', e.target.value));
    }
    if (lastNameInput) {
        lastNameInput.addEventListener('input', (e) => localStorage.setItem('userLastName', e.target.value));
    }

    // Event Listener: Upload Button Triggers Hidden Input
    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
    }

    // Event Listener: Handle File Selection
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const base64String = event.target.result;
                    // Save to local storage
                    localStorage.setItem('userProfileImage', base64String);
                    // Update UI
                    if(imgElement && iconElement) {
                        imgElement.src = base64String;
                        imgElement.classList.remove('hidden');
                        iconElement.classList.add('hidden');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Event Listener: Remove Profile Picture
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            localStorage.removeItem('userProfileImage');
            if(fileInput) fileInput.value = ""; // Reset input
            if(imgElement && iconElement) {
                imgElement.src = "";
                imgElement.classList.add('hidden');
                iconElement.classList.remove('hidden');
            }
        });
    }
}

/* --- Theme Logic --- */
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