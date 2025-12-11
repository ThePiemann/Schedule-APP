document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

function initSettings() {
    // 1. Load saved preferences immediately
    loadTheme();
    
    // 2. Initialize Section Logic
    initAccountSettings();
    initScheduleSettings(); 
    initThemeSettings(); 

    // 3. Bind Global Toggles
    const themeToggle = document.getElementById('settingThemeToggle');
    if (themeToggle) themeToggle.addEventListener('change', toggleTheme);

    const vibrantToggle = document.getElementById('settingVibrantToggle');
    if (vibrantToggle) vibrantToggle.addEventListener('change', toggleVibrant);

    const weatherToggle = document.getElementById('settingWeatherToggle');
    if (weatherToggle) {
        weatherToggle.addEventListener('change', (e) => {
            if (typeof handleWeatherToggle === "function") handleWeatherToggle(e.target.checked);
        });
    }

    // 4. Modal Open/Close Logic
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsModal');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            switchSettingsTab('Account'); // Default tab
            settingsModal.classList.remove('hidden');
            settingsModal.classList.add('flex');
        });
    }

    if (closeSettingsBtn && settingsModal) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            settingsModal.classList.remove('flex');
            // REMOVED: location.reload();
        });
    }

    const motionToggle = document.getElementById('settingMotionToggle'); // Assuming ID is settingMotionToggle in HTML
    if (motionToggle) {
        motionToggle.addEventListener('change', (e) => {
            localStorage.setItem('reduceMotion', e.target.checked);
            loadTheme(); // Re-apply attribute
        });
    }

    setupSettingsNavigation();
}

/* ---------------------------------------------------------
   THEME LOGIC (Dark Mode, Vibrant, Accent)
   --------------------------------------------------------- */
function loadTheme() {
    const html = document.documentElement;
    
    // 1. Dark Mode
    const isDark = localStorage.getItem('isDarkMode') === 'true';
    if (isDark) html.classList.add('dark'); else html.classList.remove('dark');
    const darkToggle = document.getElementById('settingThemeToggle');
    if (darkToggle) darkToggle.checked = isDark;
    
    // 2. Vibrant Mode
    const isVibrant = localStorage.getItem('isVibrant') === 'true'; 
    if (isVibrant) html.classList.add('vibrant'); else html.classList.remove('vibrant');
    const vibrantToggle = document.getElementById('settingVibrantToggle');
    if (vibrantToggle) vibrantToggle.checked = isVibrant;

    // 3. Accent Theme
    const accent = localStorage.getItem('appAccent') || 'blue';
    html.setAttribute('data-theme', accent);

    // 4. Update Accent Buttons
    const btns = document.querySelectorAll('.theme-btn');
    btns.forEach(btn => {
        if(btn.dataset.theme === accent) {
            btn.classList.add('ring-2', 'ring-gray-400');
        } else {
            btn.classList.remove('ring-2', 'ring-gray-400');
        }
    });

    const isReduced = localStorage.getItem('reduceMotion') === 'true';
    if (isReduced) document.documentElement.setAttribute('data-motion', 'reduce');
    else document.documentElement.removeAttribute('data-motion');
    
    // Sync Toggle UI
    const motionToggle = document.getElementById('settingMotionToggle'); // Check your HTML ID (often the last switch)
    if (motionToggle) motionToggle.checked = isReduced;
}

function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('isDarkMode', isDark);
}

function toggleVibrant() {
    const html = document.documentElement;
    const isVibrant = html.classList.toggle('vibrant');
    localStorage.setItem('isVibrant', isVibrant);
}

function initThemeSettings() {
    const btns = document.querySelectorAll('.theme-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newTheme = e.target.dataset.theme;
            localStorage.setItem('appAccent', newTheme);
            loadTheme(); // Apply immediately
            if(typeof updateParityButtons === 'function') updateParityButtons();
            if(typeof initWeekCounter === 'function') initWeekCounter();
        });
    });
}

/* ---------------------------------------------------------
   SCHEDULE SETTINGS (Week Counter & Bi-Weekly)
   --------------------------------------------------------- */
function initScheduleSettings() {
    // 1. Bi-Weekly Class Support
    const eoToggle = document.getElementById('settingEvenOddToggle');
    const savedEO = localStorage.getItem('isEvenOddEnabled') === 'true';
    if(eoToggle) {
        eoToggle.checked = savedEO;
        eoToggle.addEventListener('change', (e) => localStorage.setItem('isEvenOddEnabled', e.target.checked));
    }

    // 2. Week Counter Visibility
    const weekToggle = document.getElementById('settingShowWeekCounter');
    const savedWeek = localStorage.getItem('showWeekCounter') === 'true'; 
    const parityControl = document.getElementById('weekParityControl');
    
    if(weekToggle) {
        weekToggle.checked = savedWeek;
        toggleParityControl(savedWeek); 

        weekToggle.addEventListener('change', (e) => {
            localStorage.setItem('showWeekCounter', e.target.checked);
            toggleParityControl(e.target.checked);
            if(typeof initWeekCounter === 'function') initWeekCounter();
        });
    }

    function toggleParityControl(enable) {
        if(parityControl) {
            if(enable) {
                parityControl.classList.remove('opacity-50', 'pointer-events-none');
            } else {
                parityControl.classList.add('opacity-50', 'pointer-events-none');
            }
        }
    }

    // 3. Week Parity Manual Set
    const btnOdd = document.getElementById('setWeekOddBtn');
    const btnEven = document.getElementById('setWeekEvenBtn');
    
    updateParityButtons();

    if(btnOdd && btnEven) {
        btnOdd.addEventListener('click', () => {
            const rawIsEven = calculateRawEven();
            localStorage.setItem('weekParityInvert', rawIsEven ? 'true' : 'false');
            updateParityButtons();
            if(typeof initWeekCounter === 'function') initWeekCounter(); 
        });

        btnEven.addEventListener('click', () => {
            const rawIsEven = calculateRawEven();
            localStorage.setItem('weekParityInvert', !rawIsEven ? 'true' : 'false');
            updateParityButtons();
            if(typeof initWeekCounter === 'function') initWeekCounter(); 
        });
    }
}

function updateParityButtons() {
    const rawIsEven = calculateRawEven();
    const invert = localStorage.getItem('weekParityInvert') === 'true';
    const isActuallyEven = rawIsEven !== invert; 

    const btnOdd = document.getElementById('setWeekOddBtn');
    const btnEven = document.getElementById('setWeekEvenBtn');

    if(btnOdd && btnEven) {
        const baseStyle = "px-4 py-1 text-xs font-bold rounded-md transition";
        const inactiveStyle = `${baseStyle} text-gray-500 hover:text-gray-700 bg-gray-200 dark:bg-gray-700`;
        
        btnOdd.style.backgroundColor = ""; btnOdd.style.color = "";
        btnEven.style.backgroundColor = ""; btnEven.style.color = "";

        if(isActuallyEven) {
            btnEven.className = `${baseStyle} text-white shadow-sm`;
            btnEven.style.backgroundColor = "var(--primary)";
            btnOdd.className = inactiveStyle;
        } else {
            btnOdd.className = `${baseStyle} text-white shadow-sm`;
            btnOdd.style.backgroundColor = "var(--primary)";
            btnEven.className = inactiveStyle;
        }
    }
}

function calculateRawEven() {
    const d = new Date();
    const weekNum = Math.ceil((((d - new Date(d.getFullYear(),0,1)) / 86400000) + new Date(d.getFullYear(),0,1).getDay()+1)/7);
    return (weekNum % 2 === 0);
}

/* ---------------------------------------------------------
   NAVIGATION & TABS
   --------------------------------------------------------- */
function setupSettingsNavigation() {
    const tabs = ['Account', 'Schedule', 'Notifications', 'Theme', 'About'];
    tabs.forEach(tab => {
        const btn = document.getElementById(`setBtn${tab}`);
        if (btn) {
            btn.addEventListener('click', () => switchSettingsTab(tab));
        }
    });
}

function switchSettingsTab(activeTabName) {
    const tabs = ['Account', 'Schedule', 'Notifications', 'Theme', 'About'];
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

function initAccountSettings() {
    const firstNameInput = document.getElementById('firstNameInput');
    const lastNameInput = document.getElementById('lastNameInput');
    const uploadBtn = document.getElementById('uploadProfileBtn');
    const removeBtn = document.getElementById('removeProfileBtn');
    const fileInput = document.getElementById('uploadProfileInput');
    const imgElement = document.getElementById('currentProfileImg');
    const iconElement = document.getElementById('defaultProfileIcon');

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

    if (firstNameInput) firstNameInput.addEventListener('input', (e) => localStorage.setItem('userFirstName', e.target.value));
    if (lastNameInput) lastNameInput.addEventListener('input', (e) => localStorage.setItem('userLastName', e.target.value));

    if (uploadBtn && fileInput) uploadBtn.addEventListener('click', () => fileInput.click());

    // Cropper logic
    const cropModal = document.getElementById('cropModal');
    const cropImg = document.getElementById('cropImageToEdit');
    const confirmCrop = document.getElementById('confirmCropBtn');
    const cancelCrop = document.getElementById('cancelCropBtn');
    const closeCrop = document.getElementById('closeCropBtn');
    let cropper = null;

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    cropImg.src = event.target.result;
                    cropModal.classList.remove('hidden');
                    cropModal.classList.add('flex');
                    if(cropper) cropper.destroy();
                    cropper = new Cropper(cropImg, { aspectRatio: 1, viewMode: 1 });
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });
    }
    
    function closeCropLogic() {
        cropModal.classList.add('hidden');
        cropModal.classList.remove('flex');
        if(cropper) { cropper.destroy(); cropper = null; }
    }

    if(confirmCrop) {
        confirmCrop.addEventListener('click', () => {
            if(!cropper) return;
            // 1. Get the image as a small file (300x300)
            const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
            
            // 2. Save to Local Storage
            localStorage.setItem('userProfileImage', canvas.toDataURL());
            
            // 3. Update the UI immediately
            if(imgElement && iconElement) {
                imgElement.src = canvas.toDataURL();
                imgElement.classList.remove('hidden');
                iconElement.classList.add('hidden');
            }
            
            closeCropLogic();

            // 4. ADD THIS: Trigger Cloud Save immediately
            if(typeof window.saveUserData === 'function') {
                window.saveUserData();
            }
        });
    }
    
    if(cancelCrop) cancelCrop.addEventListener('click', closeCropLogic);
    if(closeCrop) closeCrop.addEventListener('click', closeCropLogic);

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            localStorage.removeItem('userProfileImage');
            if(imgElement && iconElement) {
                imgElement.src = "";
                imgElement.classList.add('hidden');
                iconElement.classList.remove('hidden');
            }
        });
    }

    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                data[key] = localStorage.getItem(key);
            }
            const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `studentdash_backup.json`;
            a.click();
        });
    }
    
    const importBtn = document.getElementById('importDataBtn');
    const importInput = document.getElementById('importDataInput');
    
    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if(confirm("Importing data will overwrite your current settings and schedule. Continue?")) {
                        Object.keys(data).forEach(key => {
                            localStorage.setItem(key, data[key]);
                        });
                        alert('Data imported successfully!');
                        location.reload(); // Hard reload needed for deep data resets
                    }
                } catch(err) {
                    alert('Invalid data file.');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }
}
