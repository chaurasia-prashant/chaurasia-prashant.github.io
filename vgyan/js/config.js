/**
 * vGyan Configuration
 * Populated with Firebase credentials. GitHub secrets are fetched from Firestore.
 */

const config = {
    firebase: {
        apiKey: "AIzaSyBho6r-BmL-l2wGmgVmpEuyLqIX5WfP4Gc",
        authDomain: "vgyan-89042.firebaseapp.com",
        projectId: "vgyan-89042",
        storageBucket: "vgyan-89042.firebasestorage.app",
        messagingSenderId: "272031291148",
        appId: "1:272031291148:web:e6f27289a0d882b9da9b29",
        measurementId: "G-KDZJDM9BJM"
    },
    github: {
        pat: "", // Loaded from Firestore
        username: "chaurasia-prashant",
        repos: {
            users: "quiz_users",
            files: "quizFiles"
        }
    },
    encryptionKey: "", // Loaded from Firestore
    isLoaded: false
};

/**
 * Initializes the configuration and fetches secrets if a user is logged in.
 */
export async function initConfig() {
    if (config.isLoaded && config.github.pat) return config;

    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js");
    const { getAuth } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

    let app;
    if (!getApps().length) {
        app = initializeApp(config.firebase);
    } else {
        app = getApps()[0];
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    window.auth = auth;
    window.db = db;

    // Try to fetch secrets if already logged in
    if (auth.currentUser) {
        await fetchSecrets(db);
    }

    config.isLoaded = true;
    return config;
}

/**
 * Explicitly fetches secrets from Firestore admin/secrets document.
 */
export async function fetchSecrets(db) {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    try {
        const docRef = doc(db, "admin", "secrets");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            config.github.pat = data.TAP || "";
            config.encryptionKey = data.AUTHENC || "";
            console.log("System secrets loaded successfully.");
            return true;
        } else {
            console.error("Firestore Error: Document 'admin/secrets' does not exist.");
        }
    } catch (e) {
        console.error("Firestore Error: Failed to fetch 'admin/secrets'. Check your Security Rules.", e);
    }
    return false;
}

export default config;
