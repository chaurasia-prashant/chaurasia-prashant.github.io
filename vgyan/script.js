document.addEventListener('DOMContentLoaded', () => {
    // Add ripple effect or simple click feedback to tiles
    const tiles = document.querySelectorAll('.tile');

    tiles.forEach(tile => {
        tile.addEventListener('click', function(e) {
            // Simple feedback log
            const task = this.querySelector('h3').innerText;
            console.log(`Navigating to ${task}...`);

            // You can add page transition logic here
            // For now, we use hash-based navigation in HTML
        });
    });

    // Handle hash change for simple "routing"
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1);
        if (hash) {
            handleNavigation(hash);
        }
    });

    function handleNavigation(page) {
        console.log('Switching to page:', page);
        // In a real app, you would load content dynamically here
        // For this demo, we can show an alert or a simple modal
        // alert(`Welcome to the ${page.charAt(0).toUpperCase() + page.slice(1)} section! This feature is coming soon.`);
    }

    // Add some entry animations
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
