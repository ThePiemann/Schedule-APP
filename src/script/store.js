/* src/script/store.js */
import { db, doc, getDoc, setDoc } from './auth.js';

// Global Data Store
export let userData = {
    schedule: {},
    advancedTodos: [],
    subjectColors: {},
    settings: {}
};

export let appState = {
    currentUser: null,
    isEvenWeek: false
};

// --- DATA HELPERS ---

export function setCurrentUser(user) {
    appState.currentUser = user;
}

export function getSubjectColor(subject) {
    if (!subject) return '#F3F4F6';
    const key = subject.trim().toUpperCase();
    if (userData.subjectColors[key]) return userData.subjectColors[key];
    
    const hue = Math.floor(Math.random() * 360);
    const newColor = `hsl(${hue}, 95%, 90%)`; 
    userData.subjectColors[key] = newColor;
    saveUserData(); 
    return newColor;
}

export function parseSlotData(rawData, defaultHour) {
    if (!rawData) return null;
    try {
        if (typeof rawData === 'object') return rawData;
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
    return { subject: rawData, start: `${defaultHour.toString().padStart(2,'0')}:00`, end: `${(defaultHour + 1).toString().padStart(2,'0')}:00`, location: "", type: "", teacher: "", color: getSubjectColor(rawData), weekType: "every" };
}

// --- FIREBASE SYNC ---

export async function loadUserData(refreshCallback) {
    if (!appState.currentUser) return;
    try {
        const docRef = doc(db, "users", appState.currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            userData.schedule = data.schedule || {};
            
            // Handle tasks safely
            if (typeof data.advancedTodos === 'string') {
                try { userData.advancedTodos = JSON.parse(data.advancedTodos); } catch(e) { userData.advancedTodos = []; }
            } else {
                userData.advancedTodos = data.advancedTodos || [];
            }

            // Handle colors
            if (typeof data.subjectColors === 'string') {
                try { userData.subjectColors = JSON.parse(data.subjectColors); } catch(e) { userData.subjectColors = {}; }
            } else {
                userData.subjectColors = data.subjectColors || {};
            }

            userData.settings = data.settings || {};
            console.log("Data loaded from Cloud");
            
            if (refreshCallback) refreshCallback();
        } else {
            console.log("New user - starting with empty data.");
            saveUserData();
        }
    } catch (e) {
        console.error("Error loading data:", e);
    }
}

export async function saveUserData() {
    if (!appState.currentUser) return;
    const dataToSave = {
        schedule: userData.schedule,
        advancedTodos: JSON.stringify(userData.advancedTodos),
        subjectColors: JSON.stringify(userData.subjectColors),
        lastUpdated: new Date().toISOString()
    };
    try {
        await setDoc(doc(db, "users", appState.currentUser.uid), dataToSave, { merge: true });
        console.log("Saved to Cloud...");
    } catch (e) {
        console.error("Error saving data:", e);
    }
}

// Make globally available for settings.js legacy support
window.saveUserData = saveUserData;