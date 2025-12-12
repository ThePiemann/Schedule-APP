/* src/script/settings.js */

import { auth, db, doc, getDoc, updateDoc, logoutUser, deleteUserAccount } from './auth.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Global cache for settings to avoid re-fetching constantly
let currentUserSettings = {};
let userDocRef = null;

document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

function initSettings() {
    // 1. Setup Auth Listener (This replaces loading from localStorage)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("Settings: User authenticated. Fetching cloud data...");
            userDocRef = doc(db, "users", user.uid);
            await fetchAndApplySettings(user);
        } else {
            // If no user, maybe redirect or reset to defaults
            console.log("Settings: No user logged in.");
        }
    });

    // 2. Bind UI Toggles (Now saving to Cloud)
    setupEventListeners();

    // 3. Setup Navigation
    setupSettingsNavigation();
}

// --- CLOUD SYNC LOGIC ---

async function fetchAndApplySettings(user) {
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            // Load all settings into memory
            const data = docSnap.data();
            currentUserSettings = {
                ...data.settings, // General settings
                userProfileImage: data.settings?.userProfileImage || null // Ensure image is accessible
            };

            // Apply them to the UI
            applyTheme(currentUserSettings);
            populateAccountFields(user, currentUserSettings);
            updateToggleState('settingThemeToggle', currentUserSettings.isDarkMode === 'true');
            updateToggleState('settingVibrantToggle', currentUserSettings.isVibrant === 'true');
            updateToggleState('settingWeatherToggle', currentUserSettings.isWeatherEnabled === 'true');
            updateToggleState('settingShowWeekCounter', currentUserSettings.showWeekCounter === 'true');
            updateToggleState('settingEvenOddToggle', currentUserSettings.isEvenOddEnabled === 'true');
            
            // Handle Profile Image
            if (currentUserSettings.userProfileImage) {
                const img = document.getElementById('currentProfileImg');
                const icon = document.getElementById('defaultProfileIcon');
                if (img && icon) {
                    img.src = currentUserSettings.userProfileImage;
                    img.classList.remove('hidden');
                    icon.classList.add('hidden');
                }
            }

            console.log("Settings applied from Cloud.");
        }
    } catch (e) {
        console.error("Error fetching settings:", e);
    }
}

async function saveSettingToCloud(key, value) {
    if (!userDocRef) return;
    
    // Update local cache
    currentUserSettings[key] = value;

    // Update Cloud
    // We store settings inside a 'settings' map in Firestore to keep it organized
    try {
        const updateData = {};
        updateData[`settings.${key}`] = value;
        await updateDoc(userDocRef, updateData);
        console.log(`Saved ${key} to Cloud.`);
    } catch (e) {
        console.error(`Failed to save ${key}:`, e);
    }
}

// --- UI LOGIC ---

function setupEventListeners() {
    // Theme Toggles
    bindToggle('settingThemeToggle', (checked) => {
        saveSettingToCloud('isDarkMode', checked ? 'true' : 'false');
        applyTheme({ ...currentUserSettings, isDarkMode: checked ? 'true' : 'false' });
    });

    bindToggle('settingVibrantToggle', (checked) => {
        saveSettingToCloud('isVibrant', checked ? 'true' : 'false');
        applyTheme({ ...currentUserSettings, isVibrant: checked ? 'true' : 'false' });
    });

    // Weather
    bindToggle('settingWeatherToggle', (checked) => {
        saveSettingToCloud('isWeatherEnabled', checked ? 'true' : 'false');
        if (typeof handleWeatherToggle === "function") handleWeatherToggle(checked);
    });

    // Schedule Settings
    bindToggle('settingShowWeekCounter', (checked) => {
        saveSettingToCloud('showWeekCounter', checked ? 'true' : 'false');
        // Refresh UI if needed (might require reload or observer in script.js)
    });

    bindToggle('settingEvenOddToggle', (checked) => {
        saveSettingToCloud('isEvenOddEnabled', checked ? 'true' : 'false');
    });

    bindToggle('settingMotionToggle', (checked) => {
        saveSettingToCloud('reduceMotion', checked ? 'true' : 'false');
        applyTheme({ ...currentUserSettings, reduceMotion: checked ? 'true' : 'false' });
    });

    // Theme Accent Buttons
    const themeBtns = document.querySelectorAll('.theme-btn');
    themeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const accent = e.target.dataset.theme;
            saveSettingToCloud('appAccent', accent);
            applyTheme({ ...currentUserSettings, appAccent: accent });
        });
    });

    // Account Buttons (Sign Out / Delete)
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            await logoutUser();
            window.location.href = '/login';
        });
    }

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if (confirm("DANGER: Are you sure? This will permanently delete your account and all data. This cannot be undone.")) {
                const result = await deleteUserAccount();
                if (result.success) {
                    alert("Account deleted.");
                    window.location.href = '/signup';
                } else {
                    alert("Error: " + result.errorMessage);
                }
            }
        });
    }

    // Modal Handlers
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
    
    setupAccountInputs();
    setupDataManagement();
}

function bindToggle(id, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('change', (e) => callback(e.target.checked));
    }
}

function updateToggleState(id, isChecked) {
    const el = document.getElementById(id);
    if (el) el.checked = isChecked;
}

function applyTheme(settings) {
    const html = document.documentElement;
    const isDark = settings.isDarkMode === 'true';
    const isVibrant = settings.isVibrant === 'true';
    const accent = settings.appAccent || 'blue';
    const isReduced = settings.reduceMotion === 'true';

    if (isDark) html.classList.add('dark'); else html.classList.remove('dark');
    if (isVibrant) html.classList.add('vibrant'); else html.classList.remove('vibrant');
    
    html.setAttribute('data-theme', accent);

    if (isReduced) html.setAttribute('data-motion', 'reduce');
    else html.removeAttribute('data-motion');

    // Update active state on buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        if(btn.dataset.theme === accent) btn.classList.add('ring-2', 'ring-gray-400');
        else btn.classList.remove('ring-2', 'ring-gray-400');
    });
}

function setupAccountInputs() {
    const firstNameInput = document.getElementById('firstNameInput');
    const lastNameInput = document.getElementById('lastNameInput');
    
    // Add Debounce to prevent too many DB writes
    let timeout = null;
    const debouncedSave = (key, value) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => saveSettingToCloud(key, value), 1000);
    };

    if (firstNameInput) firstNameInput.addEventListener('input', (e) => debouncedSave('userFirstName', e.target.value));
    if (lastNameInput) lastNameInput.addEventListener('input', (e) => debouncedSave('userLastName', e.target.value));

    // Profile Picture (Cropper Logic)
    setupProfilePicture();
}

function populateAccountFields(user, settings) {
    // Email (from Auth)
    const emailDisplay = document.getElementById('settingsEmailDisplay');
    if (emailDisplay && user.email) emailDisplay.value = user.email;

    // Names (from Firestore)
    const firstNameInput = document.getElementById('firstNameInput');
    const lastNameInput = document.getElementById('lastNameInput');
    if (firstNameInput && settings.userFirstName) firstNameInput.value = settings.userFirstName;
    if (lastNameInput && settings.userLastName) lastNameInput.value = settings.userLastName;
}

function setupProfilePicture() {
    const uploadBtn = document.getElementById('uploadProfileBtn');
    const removeBtn = document.getElementById('removeProfileBtn');
    const fileInput = document.getElementById('uploadProfileInput');
    const imgElement = document.getElementById('currentProfileImg');
    const iconElement = document.getElementById('defaultProfileIcon');
    const cropModal = document.getElementById('cropModal');
    const cropImg = document.getElementById('cropImageToEdit');
    const confirmCrop = document.getElementById('confirmCropBtn');
    const cancelCrop = document.getElementById('cancelCropBtn');
    const closeCrop = document.getElementById('closeCropBtn');
    let cropper = null;

    if (uploadBtn && fileInput) uploadBtn.addEventListener('click', () => fileInput.click());

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

    const closeCropLogic = () => {
        cropModal.classList.add('hidden');
        cropModal.classList.remove('flex');
        if(cropper) { cropper.destroy(); cropper = null; }
    };

    if(confirmCrop) {
        confirmCrop.addEventListener('click', () => {
            if(!cropper) return;
            const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
            const base64Image = canvas.toDataURL();
            
            // Save directly to Cloud
            saveSettingToCloud('userProfileImage', base64Image);
            
            // Update UI
            if(imgElement && iconElement) {
                imgElement.src = base64Image;
                imgElement.classList.remove('hidden');
                iconElement.classList.add('hidden');
            }
            closeCropLogic();
        });
    }
    
    if(cancelCrop) cancelCrop.addEventListener('click', closeCropLogic);
    if(closeCrop) closeCrop.addEventListener('click', closeCropLogic);

    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            if(confirm("Remove profile picture?")) {
                saveSettingToCloud('userProfileImage', null);
                if(imgElement && iconElement) {
                    imgElement.src = "";
                    imgElement.classList.add('hidden');
                    iconElement.classList.remove('hidden');
                }
            }
        });
    }
}

function setupDataManagement() {
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            // Export from Cloud Data (not localStorage)
            if (!userDocRef) { alert("Not synced yet."); return; }
            
            const docSnap = await getDoc(userDocRef);
            if(docSnap.exists()) {
                const data = docSnap.data();
                const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `studentdash_cloud_backup.json`;
                a.click();
            }
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
            reader.onload = async (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if(confirm("Importing data will OVERWRITE your Cloud data. Continue?")) {
                        await updateDoc(userDocRef, data); // Overwrite cloud doc
                        alert('Data imported to Cloud! Reloading...');
                        location.reload(); 
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