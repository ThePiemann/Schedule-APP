/* src/script/auth.js */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
// ADDED: Import Firestore
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBU7EdAmfRqwXohjzU-9ZJ2uPCVKRDzXOw",
    authDomain: "studentdash-58a12.firebaseapp.com",
    projectId: "studentdash-58a12",
    storageBucket: "studentdash-58a12.firebasestorage.app",
    messagingSenderId: "391306205016",
    appId: "1:391306205016:web:da17c4dab9329dd242772d",
    measurementId: "G-NCP4WLFTYW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const analytics = getAnalytics(app);
const db = getFirestore(app); // Initialize Firestore

export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, errorMessage: getErrorMessage(error.code) };
    }
}

export async function registerUser(email, password, username) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: username });
        return { success: true, user: user };
    } catch (error) {
        return { success: false, errorMessage: getErrorMessage(error.code) };
    }
}

export function logoutUser() {
    return signOut(auth);
}

function getErrorMessage(code) {
    switch (code) {
        case 'auth/invalid-email': return "Invalid email address.";
        case 'auth/user-disabled': return "This account has been disabled.";
        case 'auth/user-not-found': return "No account found with this email.";
        case 'auth/wrong-password': return "Incorrect password.";
        case 'auth/email-already-in-use': return "Email is already in use.";
        case 'auth/weak-password': return "Password should be at least 6 characters.";
        case 'auth/invalid-credential': return "Invalid credentials.";
        default: return "An error occurred. Please try again.";
    }
}

// Global Auth Listener to redirect IF on login pages
onAuthStateChanged(auth, (user) => {
   if (user && (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html'))) {
       window.location.href = 'dashboard.html'; 
   }
});

// Export everything needed for the dashboard
export { auth, db, doc, setDoc, getDoc };