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
        // Only show body once auth check is complete to prevent flickering
        document.body.style.visibility = 'visible';
    }
}
checkAuth();

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('loginUsername').value;
    const passwordInput = document.getElementById('loginPassword').value;

    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;

    try {
        btn.textContent = "Authenticating...";
        btn.disabled = true;

        // 1. Fetch users from your GitHub repo (quiz_users)
        const users = await githubService.getFile(config.github.repos.users, "users.json");

        // 2. Find user by username
        const user = users.find(u => u.username === usernameInput);

        if (user) {
            if (!user.allow) {
                notify("Your account is disabled.");
                resetBtn(btn, originalText);
                return;
            }

            // 3. Verify password by decrypting the stored password using AUTHENC key
            try {
                const decryptedPassword = await decryptData(user.password);

                if (decryptedPassword === passwordInput) {
                    // Success! Store session
                    const sessionData = {
                        username: user.username,
                        access: String(user.access) === "true",
                        loggedInAt: new Date().toISOString()
                    };
                    localStorage.setItem('vgyan_session', JSON.stringify(sessionData));

                    // Update login status in the background
                    updateLoginStatus(user.username, users).catch(console.error);

                    window.location.href = 'index.html';
                } else {
                    notify("Invalid username or password.");
                    resetBtn(btn, originalText);
                }
            } catch (cryptoErr) {
                console.error("Decryption error:", cryptoErr);
                notify("Auth Error: Encryption key mismatch or corrupted data.");
                resetBtn(btn, originalText);
            }
        } else {
            notify("Invalid username or password.");
            resetBtn(btn, originalText);
        }
    } catch (error) {
        notify("Connection error. Check GitHub status or PAT.");
        console.error(error);
        resetBtn(btn, originalText);
    }
});

function resetBtn(btn, text) {
    btn.textContent = text;
    btn.disabled = false;
}

async function updateLoginStatus(username, allUsers) {
    const userIndex = allUsers.findIndex(u => u.username === username);
    if (userIndex === -1) return;

    allUsers[userIndex].isLogged = true;
    allUsers[userIndex].date = new Date().toISOString();

    const metadata = await githubService.getFileMetadata(config.github.repos.users, "users.json");
    await githubService.updateFile(
        config.github.repos.users,
        "users.json",
        JSON.stringify(allUsers, null, 2),
        `Login update: ${username}`,
        metadata.sha
    );
}
