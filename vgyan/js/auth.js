import githubService from './github-service.js';
import { sha256, notify } from './utils.js';
import config from './config.js';

const loginForm = document.getElementById('loginForm');
const authError = document.getElementById('auth-error');

// Note: Signup is disabled in this version as users are managed in the JSON file
const signupFormSection = document.getElementById('signup-form');
if (signupFormSection) {
    signupFormSection.innerHTML = `
        <h2>Access Restricted</h2>
        <p>User registration is managed by the administrator. Please contact support if you need an account.</p>
        <p class="switch-auth"><a href="#" id="showLogin">Back to Login</a></p>
    `;
}

document.getElementById('showSignup')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
});

document.getElementById('showLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
});

loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('loginEmail').value; // Using existing ID for simplicity
    const passwordInput = document.getElementById('loginPassword').value;

    try {
        // Show loading state
        const btn = e.target.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = "Authenticating...";
        btn.disabled = true;

        // 1. Fetch users from GitHub
        const users = await githubService.getFile(config.github.repos.users, "users.json");

        // 2. Hash input password
        const hashedInput = await sha256(passwordInput);

        // 3. Find user
        const user = users.find(u => u.username === usernameInput && u.password === hashedInput);

        if (user) {
            if (!user.allow) {
                notify("Your account is disabled.");
                resetBtn(btn, originalText);
                return;
            }

            // Save user session locally
            const sessionData = {
                username: user.username,
                access: user.access === "true" || user.access === true,
                loggedInAt: new Date().toISOString()
            };
            localStorage.setItem('vgyan_session', JSON.stringify(sessionData));

            // Optional: Update isLogged in GitHub repo (Requires PAT with Write access)
            try {
                await updateLoginStatus(user.username, users);
            } catch (err) {
                console.warn("Could not update login status on server, but proceeding locally.");
            }

            window.location.href = 'index.html';
        } else {
            notify("Invalid username or password.");
            resetBtn(btn, originalText);
        }
    } catch (error) {
        notify("Connection error. Check your PAT or Network.");
        console.error(error);
        resetBtn(e.target.querySelector('button'), "Login");
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

// Check if already logged in
if (localStorage.getItem('vgyan_session')) {
    window.location.href = 'index.html';
}
