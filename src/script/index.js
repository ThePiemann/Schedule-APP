/* src/script/index.js */

import { auth, db, doc, getDoc, onAuthStateChanged, logoutUser } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // UI Elements
    const loginContainer = document.getElementById('navLoginContainer');
    const profileContainer = document.getElementById('navProfileContainer');
    const navProfileBtn = document.getElementById('profileDropdownBtn');
    const navProfileImg = document.getElementById('navProfileImg');
    const navProfileIcon = document.getElementById('navProfileIcon');
    
    const dropdownMenu = document.getElementById('profileDropdownMenu');
    const closeDropdownBtn = document.getElementById('closeDropdownBtn');
    
    // Menu Internal Elements
    const menuProfileImg = document.getElementById('menuProfileImg');
    const menuProfileIcon = document.getElementById('menuProfileIcon');
    const menuUserName = document.getElementById('menuUserName');
    const menuUserEmail = document.getElementById('menuUserEmail');
    const menuSignOutBtn = document.getElementById('menuSignOutBtn');

    // 1. Listen for Auth Changes
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // LOGGED IN
            loginContainer.classList.add('hidden');
            profileContainer.classList.remove('hidden');

            menuUserEmail.innerText = user.email;
            menuUserName.innerText = user.displayName || "Student";

            try {
                const docRef = doc(db, "users", user.uid);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const settings = data.settings || {};

                    // Update Name: Use First Name if available for "Hi, [Name]"
                    if (settings.userFirstName) {
                        menuUserName.innerText = settings.userFirstName;
                    }

                    // Update Image if available
                    if (settings.userProfileImage) {
                        // Header Icon
                        navProfileImg.src = settings.userProfileImage;
                        navProfileImg.classList.remove('hidden');
                        navProfileIcon.classList.add('hidden');
                        
                        // Menu Icon
                        menuProfileImg.src = settings.userProfileImage;
                        menuProfileImg.classList.remove('hidden');
                        menuProfileIcon.classList.add('hidden');
                    } else {
                        resetIcons();
                    }
                }
            } catch (e) {
                console.error("Profile load error:", e);
                resetIcons();
            }

        } else {
            // LOGGED OUT
            loginContainer.classList.remove('hidden');
            profileContainer.classList.add('hidden');
            dropdownMenu.classList.add('hidden');
        }
    });

    // 2. Open Dropdown
    navProfileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.remove('hidden');
    });

    // 3. Close Dropdown (X Button)
    if(closeDropdownBtn) {
        closeDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.add('hidden');
        });
    }

    // 4. Close Dropdown (Outside Click)
    document.addEventListener('click', (e) => {
        if (!profileContainer.contains(e.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });

    // 5. Sign Out
    if(menuSignOutBtn) {
        menuSignOutBtn.addEventListener('click', async () => {
            await logoutUser();
            dropdownMenu.classList.add('hidden');
        });
    }

    function resetIcons() {
        navProfileImg.classList.add('hidden');
        navProfileIcon.classList.remove('hidden');
        menuProfileImg.classList.add('hidden');
        menuProfileIcon.classList.remove('hidden');
    }
});