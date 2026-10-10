/**
 * vGyan Configuration
 * Secrets are injected via GitHub Actions from Repository Secrets (TAP, AUTHENC)
 */

const config = {
    github: {
        pat: "TAP", // Placeholder for GitHub Action
        username: "chaurasia-prashant",
        repos: {
            users: "quiz_users",
            files: "quizFiles"
        }
    },
    encryptionKey: "AUTHENC", // Placeholder for GitHub Action
    isLoaded: true
};

/**
 * Initialization function (kept for compatibility)
 */
export async function initConfig() {
    // In this version, values are injected directly into the file during deployment
    return config;
}

export default config;
