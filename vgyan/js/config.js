/**
 * vGyan Configuration
 * Secrets are injected via GitHub Actions from Repository Secrets (TAP, AUTHENC)
 */

const config = {
    github: {
        pat: "___TAP___", // Placeholder for GitHub Action replacement
        username: "chaurasia-prashant",
        repos: {
            users: "quiz_users",
            files: "quizFiles"
        }
    },
    encryptionKey: "___AUTHENC___", // Placeholder for GitHub Action replacement
    isLoaded: false
};

/**
 * Initialization function to handle local development fallbacks
 */
export async function initConfig() {
    if (config.isLoaded) return config;

    // Try to load from localStorage if testing locally (overrides placeholders)
    const localPat = localStorage.getItem('VGYAN_PAT');
    if (localPat) {
        config.github.pat = localPat;
    }

    const localKey = localStorage.getItem('VGYAN_KEY');
    if (localKey) {
        config.encryptionKey = localKey;
    }

    config.isLoaded = true;
    return config;
}

export default config;
