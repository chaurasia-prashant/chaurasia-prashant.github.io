import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import githubService from './github-service.js';
import { notify } from './utils.js';
import { encryptData, decryptData } from './crypto.js';
import config, { initConfig, fetchSecrets } from './config.js';

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const loginFormDiv = document.getElementById('login-form');
const signupFormDiv = document.getElementById('signup-form');

// Toggle between Login and Signup
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

// Initialize and check session
async function checkAuth() {
    try {
        await initConfig();
        if (localStorage.getItem('vgyan_session')) {
            window.location.href = 'index.html';
        } else {
            document.body.style.visibility = 'visible';
        }
    } catch (e) {
        console.error("Initialization error:", e);
        document.body.style.visibility = 'visible';
    }
}
checkAuth();

signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim().toLowerCase();
    const password = document.getElementById('signupPassword').value;

    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;

    try {
        btn.textContent = "Creating Account...";
        btn.disabled = true;

        // 1. Firebase Auth Signup
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        const firebaseUser = userCredential.user;

        // 2. Fetch Secrets to access GitHub
        await fetchSecrets(window.db);

        // 3. Add user to GitHub users.json with access=false
        const users = await githubService.getFile(config.github.repos.users, "users.json");

        // Check if user already exists in GitHub list
        if (users.find(u => u.email.toLowerCase() === email)) {
            throw new Error("User already exists in record.");
        }

        const encryptedPassword = await encryptData(password);

        const newUser = {
            name: name,
            email: email,
            username: email.split('@')[0], // Default username from email
            password: encryptedPassword,
            access: false, // Default: no access to features
            allow: true,   // Account is active but unauthorized
            isLogged: false,
            date: new Date().toISOString()
        };

        users.push(newUser);

        const metadata = await githubService.getFileMetadata(config.github.repos.users, "users.json");
        await githubService.updateFile(
            config.github.repos.users,
            "users.json",
            JSON.stringify(users, null, 2),
            `Signup: ${email}`,
            metadata.sha
        );

        notify("Account created! Please wait for admin approval.");

        // Switch to login
        signupFormDiv.style.display = 'none';
        loginFormDiv.style.display = 'block';
        resetBtn(btn, originalText);

    } catch (error) {
        notify(error.message);
        console.error("Signup Error:", error);
        resetBtn(btn, originalText);
    }
});

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // The user enters their "username" which we'll treat as their login identifier
    // If your Firebase users use email, you might need to append a domain:
    // const email = usernameInput.includes('@') ? usernameInput : `${usernameInput}@vgyan.com`;
    const usernameInput = document.getElementById('loginUsername').value.trim().toLowerCase();
    const passwordInput = document.getElementById('loginPassword').value;

    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;

    try {
        btn.textContent = "Authenticating...";
        btn.disabled = true;

        // 1. Firebase Authentication
        // Note: Using the input as email. Adjust if your Firebase setup uses full emails.
        const userCredential = await signInWithEmailAndPassword(window.auth, usernameInput, passwordInput);
        const firebaseUser = userCredential.user;

        // 2. Fetch GitHub Secrets from Firestore (admin/secrets)
        const secretsLoaded = await fetchSecrets(window.db);
        if (!secretsLoaded) {
            throw new Error("Failed to load secure configuration from Firestore.");
        }

        // 3. Fetch user details from GitHub (permissions, access level)
        const users = await githubService.getFile(config.github.repos.users, "users.json");

        if (!Array.isArray(users)) {
            throw new Error("Invalid format for users.json on GitHub.");
        }

        // 4. Find user record (Case-Insensitive)
        const user = users.find(u => {
            const storedUsername = (u.username || "").toString().toLowerCase();
            const storedEmail = (u.email || "").toString().toLowerCase();
            return storedUsername === usernameInput || storedEmail === usernameInput;
        });

        if (user) {
            // Check access allowance
            const isAllowed = String(user.allow).toLowerCase() !== "false";

            if (!isAllowed) {
                notify("Account disabled by administrator.");
                resetBtn(btn, originalText);
                return;
            }

            // Optional: Secondary password check via decryption if you want to keep it
            // Otherwise, Firebase Auth is already successful at this point.
            if (user.password) {
                try {
                    const decryptedPassword = await decryptData(user.password);
                    if (decryptedPassword !== passwordInput) {
                        throw new Error("Secondary authentication failed.");
                    }
                } catch (cryptoErr) {
                    console.warn("Secondary password decryption skipped or failed.");
                }
            }

            // 5. Success - Save session
            const sessionData = {
                uid: firebaseUser.uid,
                username: user.username,
                email: firebaseUser.email,
                access: String(user.access).toLowerCase() === "true",
                loggedInAt: new Date().toISOString()
            };
            localStorage.setItem('vgyan_session', JSON.stringify(sessionData));

            // Update status in background
            updateLoginStatus(user.username, users).catch(err => console.warn("Status sync failed", err));

            window.location.href = 'index.html';
        } else {
            notify("Authentication successful, but user not found in the access list.");
            resetBtn(btn, originalText);
        }
    } catch (error) {
        let msg = "Login failed.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            msg = "Invalid username or password.";
        } else {
            msg = error.message;
        }
        notify(msg);
        console.error("Login Process Error:", error);
        resetBtn(btn, originalText);
    }
});

function resetBtn(btn, text) {
    btn.textContent = text;
    btn.disabled = false;
}

async function updateLoginStatus(username, allUsers) {
    const userIndex = allUsers.findIndex(u => (u.username || "").toString().toLowerCase() === username.toLowerCase());
    if (userIndex === -1) return;

    allUsers[userIndex].isLogged = true;
    allUsers[userIndex].date = new Date().toISOString();

    try {
        const metadata = await githubService.getFileMetadata(config.github.repos.users, "users.json");
        await githubService.updateFile(
            config.github.repos.users,
            "users.json",
            JSON.stringify(allUsers, null, 2),
            `Login: ${username}`,
            metadata.sha
        );
    } catch (e) {
        console.warn("Could not update login status on GitHub:", e);
    }
}
