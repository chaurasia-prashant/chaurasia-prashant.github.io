import config, { initConfig } from './config.js';

/**
 * Service to interact with GitHub Repositories
 */
class GitHubService {
    constructor() {
        this.baseUrl = "https://api.github.com/repos";
    }

    async getHeaders() {
        await initConfig();
        const headers = {
            "Accept": "application/vnd.github.v3+json"
        };

        const token = config.github.pat;
        // Check if token is real (not a placeholder)
        if (token && !token.startsWith('___') && token !== "TAP" && token.trim() !== "") {
            // 'Bearer' is the modern standard for GitHub API
            headers["Authorization"] = `Bearer ${token.trim()}`;
        }

        return headers;
    }

    /**
     * Fetches a file from a repository
     */
    async getFile(repoName, path) {
        await initConfig();
        const headers = await this.getHeaders();
        const url = `${this.baseUrl}/${config.github.username}/${repoName}/contents/${path}`;

        try {
            const response = await fetch(url, { headers });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`GitHub: File '${path}' not found. Check repository names in config.js.`);
                }
                if (response.status === 401) {
                    throw new Error("GitHub: Invalid PAT. Ensure your token is correct.");
                }
                if (response.status === 403) {
                    throw new Error("GitHub: Access Denied. Ensure your PAT has 'repo' scope.");
                }
                throw new Error(`GitHub Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (data.content) {
                // Remove whitespace/newlines from base64 string
                const base64 = data.content.replace(/\s/g, '');
                // Decode base64 to binary then to text (handles Unicode)
                const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
                const decoded = new TextDecoder().decode(bytes);

                if (path.endsWith('.json')) {
                    return JSON.parse(decoded);
                }
                return decoded;
            }
            throw new Error("GitHub: Response did not contain file content.");
        } catch (error) {
            console.error("GitHub Service Error:", error);
            if (error.message === "Failed to fetch") {
                // This usually happens due to CORS (file:// protocol) or no internet
                if (window.location.protocol === 'file:') {
                    throw new Error("CORS Error: GitHub API cannot be called from a local file. Use a local server (e.g. Live Server).");
                }
                throw new Error("Network Error: Could not connect to GitHub. Check your internet.");
            }
            throw error;
        }
    }

    /**
     * Updates a file in a repository
     */
    async updateFile(repoName, path, content, message, sha) {
        await initConfig();
        const headers = await this.getHeaders();
        const url = `${this.baseUrl}/${config.github.username}/${repoName}/contents/${path}`;

        const uint8 = new TextEncoder().encode(content);
        const base64Content = btoa(String.fromCharCode.apply(null, uint8));

        const body = {
            message: message,
            content: base64Content,
            sha: sha
        };

        const response = await fetch(url, {
            method: 'PUT',
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`GitHub Update Failed: ${err.message}`);
        }
        return await response.json();
    }

    async getFileMetadata(repoName, path) {
        await initConfig();
        const headers = await this.getHeaders();
        const url = `${this.baseUrl}/${config.github.username}/${repoName}/contents/${path}`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`Metadata Fetch Failed: ${response.status}`);
        return await response.json();
    }
}

export default new GitHubService();
