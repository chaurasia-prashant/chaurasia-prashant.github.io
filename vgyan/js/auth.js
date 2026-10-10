import githubService from './github-service.js';
import { notify } from './utils.js';
import { decryptData } from './crypto.js';
import config, { initConfig } from './config.js';

const loginForm = document.getElementById('loginForm');

// Initialize and check session
async function checkAuth() {
    await initConfig();
    if (localStorage.getItem('vgyan_session')) {
        window.location.href = 'index.html';
    } else {
        document.body.style.visibility = 'visible';
    }
}
checkAuth();

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('loginUsername').value.trim().toLowerCase();
    const passwordInput = document.getElementById('loginPassword').value;

    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;

    try {
        btn.textContent = "Authenticating...";
        btn.disabled = true;

        // Verify if PAT is present (for debugging local setup)
        if (!config.github.pat || config.github.pat.startsWith('___')) {
             // If local, check localStorage as a fallback for developer testing
             const localPat = localStorage.getItem('VGYAN_PAT');
             if (localPat) {
                 config.github.pat = localPat;
             } else {
                 throw new Error("Missing GitHub PAT. Ensure Secrets are set in GitHub or provide local VGYAN_PAT.");
             }
        }

        // 1. Fetch users from GitHub
        const users = await githubService.getFile(config.github.repos.users, "users.json");

        if (!Array.isArray(users)) {
            throw new Error("Invalid users data received from GitHub.");
        }

        // 2. Find user (Case-Insensitive)
        const user = users.find(u => u.username.toLowerCase() === usernameInput);

        if (user) {
            if (user.allow === "false" || user.allow === false) {
                notify("Your account is disabled.");
                resetBtn(btn, originalText);
                return;
            }

            // 3. Verify password via decryption
            try {
                const decryptedPassword = await decryptData(user.password);

                if (decryptedPassword === passwordInput) {
                    const sessionData = {
                        username: user.username,
                        access: String(user.access) === "true",
                        loggedInAt: new Date().toISOString()
                    };
                    localStorage.setItem('vgyan_session', JSON.stringify(sessionData));

                    // Update status
                    updateLoginStatus(user.username, users).catch(console.error);

                    window.location.href = 'index.html';
                } else {
                    notify("Invalid username or password.");
                    resetBtn(btn, originalText);
                }
            } catch (cryptoErr) {
                console.error("Decryption error:", cryptoErr);
                notify("Auth Error: Encryption key mismatch.");
                resetBtn(btn, originalText);
            }
        } else {
            notify("Invalid username or password.");
            resetBtn(btn, originalText);
        }
    } catch (error) {
        notify(error.message || "Connection error. Check PAT.");
        console.error(error);
        resetBtn(btn, originalText);
    }
});

function resetBtn(btn, text) {
    btn.textContent = text;
    btn.disabled = false;
}

async function updateLoginStatus(username, allUsers) {
    const userIndex = allUsers.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (userIndex === -1) return;

    allUsers[userIndex].isLogged = true;
    allUsers[userIndex].date = new Date().toISOString();

    const metadata = await githubService.getFileMetadata(config.github.repos.users, "users.json");
    await githubService.updateFile(
        config.github.repos.users,
        "users.json",
        JSON.stringify(allUsers, null, 2),
        `Login: ${username}`,
        metadata.sha
    );
}
