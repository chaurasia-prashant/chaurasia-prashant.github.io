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
        return {
            "Authorization": `token ${config.github.pat}`,
            "Accept": "application/vnd.github.v3.raw"
        };
    }

    /**
     * Fetches a file from a repository
     * @param {string} repoName
     * @param {string} path
     * @returns {Promise<any>}
     */
    async getFile(repoName, path) {
        await initConfig();
        const headers = await this.getHeaders();
        const url = `${this.baseUrl}/${config.github.username}/${repoName}/contents/${path}`;
        try {
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.statusText}`);

            // Check if it's JSON
            if (path.endsWith('.json')) {
                return await response.json();
            }
            return await response.text();
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
        const headers = await this.getHeaders();
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
                "Accept": "application/vnd.github.v3+json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(`Failed to update ${path}`);
        return await response.json();
    }

    // To get the SHA of a file (needed for updates)
    async getFileMetadata(repoName, path) {
        await initConfig();
        const headers = await this.getHeaders();
        const url = `${this.baseUrl}/${config.github.username}/${repoName}/contents/${path}`;
        const response = await fetch(url, {
            headers: {
                ...headers,
                "Accept": "application/vnd.github.v3+json"
            }
        });
        if (!response.ok) throw new Error(`Failed to fetch metadata for ${path}`);
        return await response.json();
    }
}

export default new GitHubService();
