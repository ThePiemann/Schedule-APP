document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

function initSettings() {
    // 1. Setup Theme
    loadTheme();
    
    // 2. Setup Account Data
    initAccountSettings();
    
    // 3. Setup Toggles
    const themeToggle = document.getElementById('settingThemeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', toggleTheme);
    }

    const vibrantToggle = document.getElementById('settingVibrantToggle');
    if (vibrantToggle) {
        vibrantToggle.addEventListener('change', toggleVibrant);
    }

    const weatherToggle = document.getElementById('settingWeatherToggle');
    if (weatherToggle) {
        weatherToggle.addEventListener('change', (e) => {
            if (typeof handleWeatherToggle === "function") {
                handleWeatherToggle(e.target.checked);
            }
        });
    }

    // 4. Setup Modal Logic
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsModal');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
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

    // REMOVED: The window.onclick listener that closed the modal on outside click
    // This ensures the modal stays open until the user explicitly clicks the close button.

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

/* --- Account Settings Logic (Export/Import + Crop) --- */
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

    if (firstNameInput) firstNameInput.addEventListener('input', (e) => localStorage.setItem('userFirstName', e.target.value));
    if (lastNameInput) lastNameInput.addEventListener('input', (e) => localStorage.setItem('userLastName', e.target.value));

    // Profile Pic Logic
    if (uploadBtn && fileInput) uploadBtn.addEventListener('click', () => fileInput.click());

    // --- CROPPER LOGIC ---
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
                    cropper = new Cropper(cropImg, { aspectRatio: 1, viewMode: 1, autoCropArea: 1 });
                };
                reader.readAsDataURL(file);
            }
            e.target.value = '';
        });
    }

    if(confirmCrop) {
        confirmCrop.addEventListener('click', () => {
            if(!cropper) return;
            const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
            const base64 = canvas.toDataURL();
            localStorage.setItem('userProfileImage', base64);
            if(imgElement && iconElement) {
                imgElement.src = base64;
                imgElement.classList.remove('hidden');
                iconElement.classList.add('hidden');
            }
            closeCropModalLogic();
        });
    }

    function closeCropModalLogic() {
         cropModal.classList.add('hidden');
         cropModal.classList.remove('flex');
         if(cropper) { cropper.destroy(); cropper = null; }
    }

    if(cancelCrop) cancelCrop.addEventListener('click', closeCropModalLogic);
    if(closeCrop) closeCrop.addEventListener('click', closeCropModalLogic);

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            localStorage.removeItem('userProfileImage');
            if(fileInput) fileInput.value = ""; 
            if(imgElement && iconElement) {
                imgElement.src = "";
                imgElement.classList.add('hidden');
                iconElement.classList.remove('hidden');
            }
        });
    }

    // --- DATA IMPORT / EXPORT LOGIC ---
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = {};
            const keys = ['userFirstName', 'userLastName', 'userProfileImage', 'isDarkMode', 'isVibrant', 'isWeatherEnabled', 'advancedTodos', 'subjectColors'];
            
            // Fixed keys
            keys.forEach(k => {
                const val = localStorage.getItem(k);
                if(val) data[k] = val;
            });
            
            // Dynamic keys (Schedule)
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('schedule-')) {
                    data[key] = localStorage.getItem(key);
                }
            }
            
            const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `studentdash_backup_${new Date().toISOString().slice(0,10)}.json`;
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
                    if(confirm("Importing data will overwrite your current schedule and settings. Continue?")) {
                        Object.keys(data).forEach(key => {
                            localStorage.setItem(key, data[key]);
                        });
                        alert('Data imported successfully!');
                        location.reload();
                    }
                } catch(err) {
                    alert('Invalid data file.');
                }
            };
            reader.readAsText(file);
            e.target.value = ''; // Reset input
        });
    }
}

/* --- Theme Logic --- */
function loadTheme() {
    const html = document.documentElement;
    
    // Dark Mode
    const isDark = localStorage.getItem('isDarkMode') === 'true';
    const darkToggle = document.getElementById('settingThemeToggle');
    
    if (isDark) { 
        html.classList.add('dark'); 
        if (darkToggle) darkToggle.checked = true; 
    } else {
        html.classList.remove('dark'); 
        if (darkToggle) darkToggle.checked = false; 
    }

    // Vibrant Mode
    const savedVibrant = localStorage.getItem('isVibrant');
    const isVibrant = savedVibrant === null || savedVibrant === 'true';
    const vibrantToggle = document.getElementById('settingVibrantToggle');
    
    if (isVibrant) { 
        html.classList.add('vibrant'); 
        if (vibrantToggle) vibrantToggle.checked = true; 
    } else {
        html.classList.remove('vibrant'); 
        if (vibrantToggle) vibrantToggle.checked = false; 
    }
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
