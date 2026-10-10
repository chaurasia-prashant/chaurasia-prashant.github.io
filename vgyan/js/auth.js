import githubService from './github-service.js';
import { notify } from './utils.js';
import { decryptData } from './crypto.js';
import config, { initConfig } from './config.js';

const loginForm = document.getElementById('loginForm');

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
    }
}
checkAuth();

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Trim and Lowercase for both sides (input handled here)
    const usernameInput = document.getElementById('loginUsername').value.trim().toLowerCase();
    const passwordInput = document.getElementById('loginPassword').value;

    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;

    try {
        btn.textContent = "Authenticating...";
        btn.disabled = true;

        // Ensure we have a token (Local testing fallback)
        if (!config.github.pat || config.github.pat.startsWith('___')) {
             const localPat = localStorage.getItem('VGYAN_PAT');
             if (localPat) {
                 config.github.pat = localPat;
             } else {
                 throw new Error("GitHub Token (PAT) is missing. If testing locally, set 'VGYAN_PAT' in localStorage.");
             }
        }

        // 1. Fetch users from GitHub
        const users = await githubService.getFile(config.github.repos.users, "users.json");

        if (!Array.isArray(users)) {
            throw new Error("Invalid format for users.json - expected an array.");
        }

        // 2. Find user (Case-Insensitive comparison on both sides)
        const user = users.find(u => {
            const storedUsername = (u.username || "").toString().toLowerCase();
            return storedUsername === usernameInput;
        });

        if (user) {
            // Check if account is allowed
            const isAllowed = String(user.allow).toLowerCase() !== "false";

            if (!isAllowed) {
                notify("Account disabled by administrator.");
                resetBtn(btn, originalText);
                return;
            }

            // 3. Verify password via decryption
            try {
                // The password in users.json is encrypted with the AUTHENC key
                const decryptedPassword = await decryptData(user.password);

                if (decryptedPassword === passwordInput) {
                    // Login Success
                    const sessionData = {
                        username: user.username,
                        access: String(user.access).toLowerCase() === "true",
                        loggedInAt: new Date().toISOString()
                    };
                    localStorage.setItem('vgyan_session', JSON.stringify(sessionData));

                    // Update login status in the background
                    updateLoginStatus(user.username, users).catch(err => console.warn("Status sync failed", err));

                    window.location.href = 'index.html';
                } else {
                    notify("Invalid username or password.");
                    resetBtn(btn, originalText);
                }
            } catch (cryptoErr) {
                console.error("Decryption failed:", cryptoErr);
                notify("Authentication Error: Encryption key mismatch.");
                resetBtn(btn, originalText);
            }
        } else {
            notify("Invalid username or password.");
            resetBtn(btn, originalText);
        }
    } catch (error) {
        // Show specific error message from GitHub Service or logic
        notify(error.message || "Connection error. Check PAT.");
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
