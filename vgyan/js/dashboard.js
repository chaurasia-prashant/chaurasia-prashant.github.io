import config, { initConfig } from './config.js';
import githubService from './github-service.js';

async function initDashboard() {
    try {
        // 1. Initialize Config and Fetch secrets from Firestore
        await initConfig();

        // 2. Verify Session
        const session = JSON.parse(localStorage.getItem('vgyan_session'));
        if (!session) {
            window.location.href = 'auth.html';
            return;
        }

        // 3. Update UI with user info
        document.getElementById('userName').textContent = session.name || 'User';
        document.getElementById('welcomeText').textContent = `Welcome back, ${session.name || 'Learner'}!`;

        // Check for access
        if (!session.isAccess) {
            document.querySelector('.dashboard-grid').innerHTML = `
                <div class="tile full-width" style="grid-column: 1 / -1; cursor: default; text-align: center;">
                    <div class="tile-icon">
                        <i class="fas fa-lock"></i>
                    </div>
                    <h3>Access Pending</h3>
                    <p>Your account is created, but you do not have access to the modules yet. Please contact the administrator.</p>
                </div>
            `;
        }

        // 4. Setup Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('vgyan_session');
            window.auth?.signOut();
            window.location.href = 'auth.html';
        });

        // 5. Hide Loading Overlay
        document.getElementById('loading-overlay').style.display = 'none';

        console.log("Dashboard initialized with GitHub PAT:", config.github.pat ? "Loaded" : "Missing");

    } catch (error) {
        console.error("Dashboard init error:", error);
        // Fallback or error UI
    }
}

document.addEventListener('DOMContentLoaded', initDashboard);
