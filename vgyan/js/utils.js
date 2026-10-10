/**
 * Utility functions for vGyan
 */

/**
 * Generates SHA-256 hash of a string
 * @param {string} string
 * @returns {Promise<string>}
 */
export async function sha256(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(bytes => bytes.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Simple notification system
 * @param {string} message
 * @param {string} type
 */
export function notify(message, type = 'error') {
    const errorElem = document.getElementById('auth-error');
    if (errorElem) {
        errorElem.textContent = message;
        errorElem.style.display = 'block';
        errorElem.style.backgroundColor = type === 'error' ? '#fab1a0' : '#55efc4';
        errorElem.style.color = type === 'error' ? '#d63031' : '#00b894';
    } else {
        alert(message);
    }
}
