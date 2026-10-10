import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { notify } from './utils.js';
import config, { initConfig, fetchSecrets } from './config.js';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const loginFormDiv = document.getElementById('login-form');
const signupFormDiv = document.getElementById('signup-form');

async function checkAuth() {
    try {
        await initConfig(); // Initializes Firebase via config.js
        if (localStorage.getItem('vgyan_session')) {
            window.location.href = 'index.html';
        } else {
            document.body.style.visibility = 'visible';
        }
    } catch (e) {
        console.error("Initialization failed:", e);
        document.body.style.visibility = 'visible';
    }
}
checkAuth();

// UI Toggles
showSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    loginFormDiv.style.display = 'none';
    signupFormDiv.style.display = 'block';
});
showLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    signupFormDiv.style.display = 'none';
    loginFormDiv.style.display = 'block';
});

// Signup Process (Pure Firebase)
signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;
    const btn = e.target.querySelector('button');

    try {
        btn.textContent = "Creating Account...";
        btn.disabled = true;

        // 1. Firebase Auth Signup
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        // 2. Set Display Name
        await updateProfile(user, { displayName: name });

        // 3. Create User Document in Firestore
        // This is the 'User Modal'
        await setDoc(doc(window.db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            isAccess: false, // Default: Admin must approve
            role: "student",
            createdAt: new Date().toISOString()
        });

        notify("Account created! Please wait for admin approval.");
        signupFormDiv.style.display = 'none';
        loginFormDiv.style.display = 'block';
    } catch (error) {
        notify(error.message);
        console.error("Signup Error:", error);
    } finally {
        btn.textContent = "Sign Up";
        btn.disabled = false;
    }
});

// Login Process
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const btn = e.target.querySelector('button');

    try {
        btn.textContent = "Logging in...";
        btn.disabled = true;

        // 1. Firebase Auth Login
        const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;

        // 2. Load System Secrets (GitHub PAT) from Firestore
        const secretsLoaded = await fetchSecrets(window.db);
        if (!secretsLoaded) {
            console.warn("Secure configuration (TAP) not found in Firestore. GitHub features may fail.");
        }

        // 3. Fetch User Permissions from Firestore
        const userDoc = await getDoc(doc(window.db, "users", user.uid));
        let userData = userDoc.exists() ? userDoc.data() : null;

        // Auto-create doc if missing (for existing users)
        if (!userData) {
            userData = {
                uid: user.uid,
                name: user.displayName || email.split('@')[0],
                email: user.email,
                isAccess: false,
                createdAt: new Date().toISOString()
            };
            await setDoc(doc(window.db, "users", user.uid), userData);
        }

        // 4. Save Session
        const sessionData = {
            uid: user.uid,
            name: userData.name,
            email: user.email,
            isAccess: userData.isAccess === true,
            loggedInAt: new Date().toISOString()
        };
        localStorage.setItem('vgyan_session', JSON.stringify(sessionData));

        window.location.href = 'index.html';
    } catch (error) {
        notify(error.message);
        console.error("Login Error:", error);
    } finally {
        btn.textContent = "Login";
        btn.disabled = false;
    }
});
