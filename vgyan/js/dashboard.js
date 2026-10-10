import { notify } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const userNameElem = document.getElementById('userName');
    const welcomeTextElem = document.getElementById('welcomeText');
    const logoutBtn = document.getElementById('logoutBtn');
    const loadingOverlay = document.getElementById('loading-overlay');

    // 1. Check Session
    const session = JSON.parse(localStorage.getItem('vgyan_session'));

    if (!session) {
        window.location.href = 'auth.html';
        return;
    }

    // 2. Setup UI
    const displayName = session.username;
    if (userNameElem) userNameElem.textContent = displayName;
    if (welcomeTextElem) welcomeTextElem.textContent = `Welcome back, ${displayName}!`;

    // Hide loading overlay
    if (loadingOverlay) loadingOverlay.style.display = 'none';

    // 3. Apply Feature Restrictions based on "access"
    const hasFullAccess = session.access === true || session.access === "true";

    if (!hasFullAccess) {
        // Restrict certain tiles
        // Example: Only allow Reading and Results for restricted users
        const restrictedTiles = ['Test Series', 'Mock Tests', 'Analytics'];
        const tiles = document.querySelectorAll('.tile');

        tiles.forEach(tile => {
            const title = tile.querySelector('h3').innerText;
            if (restrictedTiles.includes(title)) {
                tile.classList.add('restricted');
                tile.style.opacity = '0.6';
                tile.style.cursor = 'not-allowed';
                tile.title = "Access Restricted. Please upgrade your account.";

                // Override click
                tile.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    alert("This feature is restricted for your account level.");
                };
            }
        });
    }

    // 4. Logout logic
    logoutBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('vgyan_session');
        window.location.href = 'auth.html';
    });

    // 5. Dashboard Animations
    const cards = document.querySelectorAll('.tile');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.5s ease ${index * 0.1}s`;

        setTimeout(() => {
            // Don't override the opacity if it was set for restricted tiles
            if (!card.classList.contains('restricted')) {
                card.style.opacity = '1';
            } else {
                card.style.opacity = '0.6';
            }
            card.style.transform = 'translateY(0)';
        }, 100);
    });
});
