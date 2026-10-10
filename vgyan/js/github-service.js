import config, { initConfig } from './config.js';

/**
 * Service to interact with GitHub Repositories
 */
class GitHubService {
    constructor() {
        this.baseUrl = "https://api.github.com/repos";
    }

    async getHeaders(isRaw = true) {
        await initConfig();
        const headers = {
            "Accept": isRaw ? "application/vnd.github.v3.raw" : "application/vnd.github.v3+json"
        };

        // Only add token if it's not the placeholder
        if (config.github.pat && !config.github.pat.startsWith('___')) {
            headers["Authorization"] = `token ${config.github.pat}`;
        }

        return headers;
    }

    /**
     * Fetches a file from a repository
     * @param {string} repoName
     * @param {string} path
     * @returns {Promise<any>}
     */
    async getFile(repoName, path) {
        await initConfig();
        const headers = await this.getHeaders(true);
        const url = `${this.baseUrl}/${config.github.username}/${repoName}/contents/${path}`;

        try {
            const response = await fetch(url, { headers });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`File not found: ${path} in ${repoName}`);
                }
                if (response.status === 401 || response.status === 403) {
                    throw new Error("GitHub Access Denied. Check your PAT permissions (must have 'repo' scope).");
                }
                throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
            }

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return text;
            }
        } catch (error) {
            console.error("GitHub Service Error:", error);
            throw error;
        }
    }

    /**
     * Updates a file in a repository
     */
    async updateFile(repoName, path, content, message, sha) {
        await initConfig();
        const headers = await this.getHeaders(false);
        const url = `${this.baseUrl}/${config.github.username}/${repoName}/contents/${path}`;

        const body = {
            message: message,
            content: btoa(content), // Base64 encode
            sha: sha
        };

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(`Update failed: ${err.message || response.statusText}`);
        }
        return await response.json();
    }

    // To get the SHA of a file (needed for updates)
    async getFileMetadata(repoName, path) {
        await initConfig();
        const headers = await this.getHeaders(false);
        const url = `${this.baseUrl}/${config.github.username}/${repoName}/contents/${path}`;
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error(`Failed to fetch metadata for ${path}`);
        return await response.json();
    }
}

export default new GitHubService();
