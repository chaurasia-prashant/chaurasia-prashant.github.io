import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const userNameElem = document.getElementById('userName');
    const welcomeTextElem = document.getElementById('welcomeText');
    const logoutBtn = document.getElementById('logoutBtn');

    // Check Authentication State
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            const displayName = user.displayName || "Explorer";
            userNameElem.textContent = displayName;
            welcomeTextElem.textContent = `Welcome back, ${displayName.split(' ')[0]}!`;

            // Fetch additional data from Firestore if needed
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    console.log("User data:", userDoc.data());
                    // Here you can load user progress, results, etc.
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        } else {
            // User is signed out, redirect to auth page
            window.location.href = 'auth.html';
        }
    });

    // Logout logic
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = 'auth.html';
        }).catch((error) => {
            console.error("Logout Error:", error);
        });
    });

    // Dashboard Interaction
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.addEventListener('click', function() {
            const task = this.querySelector('h3').innerText;
            console.log(`Navigating to ${task}...`);
            // Add navigation logic here
        });
    });

    // Entry Animations
    const cards = document.querySelectorAll('.tile');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.5s ease ${index * 0.1}s`;

        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100);
    });
});
