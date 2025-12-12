/* src/script/auth.js */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    updateProfile, 
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider, 
    signInWithPopup,
    deleteUser,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider(); 

export async function loginUser(email, password, remember = true) {
    try {
        const persistence = remember ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, errorMessage: getErrorMessage(error.code) };
    }
}

// UPDATED: Now takes firstName and lastName
export async function registerUser(email, password, firstName, lastName) {
    try {
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 1. Update Auth Profile
        const fullName = `${firstName} ${lastName}`;
        await updateProfile(user, { displayName: fullName });

        // 2. Create User Document in Firestore immediately
        await setDoc(doc(db, "users", user.uid), {
            settings: {
                userFirstName: firstName,
                userLastName: lastName,
                isDarkMode: "false",
                isVibrant: "false"
            },
            email: email,
            createdAt: new Date().toISOString()
        }, { merge: true });

        return { success: true, user: user };
    } catch (error) {
        return { success: false, errorMessage: getErrorMessage(error.code) };
    }
}

export async function loginWithGoogle() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if new user, if so save basic Google info
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            const names = user.displayName ? user.displayName.split(' ') : ["Student", "User"];
            await setDoc(docRef, {
                settings: {
                    userFirstName: names[0],
                    userLastName: names.slice(1).join(' ') || "",
                    userProfileImage: user.photoURL
                },
                email: user.email
            }, { merge: true });
        }

        return { success: true, user: user };
    } catch (error) {
        return { success: false, errorMessage: getErrorMessage(error.code) };
    }
}

export function logoutUser() {
    return signOut(auth);
}

export async function deleteUserAccount() {
    try {
        const user = auth.currentUser;
        if (user) {
            await deleteUser(user);
            return { success: true };
        }
        return { success: false, errorMessage: "No user logged in." };
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            return { success: false, errorMessage: "Please log out and log in again to delete your account." };
        }
        return { success: false, errorMessage: error.message };
    }
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
        case 'auth/popup-closed-by-user': return "Sign in cancelled.";
        default: return "An error occurred. Please try again.";
    }
}

onAuthStateChanged(auth, (user) => {
   if (user && (window.location.pathname === '/login' || window.location.pathname === '/signup')) {
       window.location.href = '/dashboard'; 
   }
});

export { auth, db, doc, setDoc, getDoc, updateDoc, onAuthStateChanged };