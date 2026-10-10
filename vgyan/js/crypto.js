import config, { initConfig } from './config.js';

/**
 * vGyan Encryption Utility
 * Uses AES-GCM for secure data handling.
 */

async function getCryptoKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );
    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode("vgyan-salt"),
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encryptData(text) {
    await initConfig();
    if (!config.encryptionKey) throw new Error("Encryption key not configured");

    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await getCryptoKey(config.encryptionKey);

    const encrypted = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        enc.encode(text)
    );

    const exportBuffer = new Uint8Array(iv.length + encrypted.byteLength);
    exportBuffer.set(iv);
    exportBuffer.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode.apply(null, exportBuffer));
}

export async function decryptData(encryptedBase64) {
    await initConfig();
    if (!config.encryptionKey) throw new Error("Encryption key not configured");

    const data = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    const key = await getCryptoKey(config.encryptionKey);

    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encrypted
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        throw new Error("Decryption failed. Check your encryption key.");
    }
}
