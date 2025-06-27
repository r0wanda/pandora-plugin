import { BrowserWindow, safeStorage } from "electron";
import valid from 'validator';
import os from 'os';

/**
 * safeStorage/keytar api
 * @see {@link https://www.electronjs.org/docs/latest/api/safe-storage}
 */
export class NativeSafeStore {
    constructor() {
        if (!safeStorage.isEncryptionAvailable()) throw new Error('safeStorage not available');
    }
    backend() {
        const plat = os.platform();
        if (plat.search(/darwin|win32/i) < 0) return safeStorage.getSelectedStorageBackend();
        return plat;
    }
    /**
     * Decrypt data
     * @param it Encrypted data
     * @returns The decrypted data or undefined if invalid
     */
    decrypt(it: any) {
        if (typeof it !== 'string' || !valid.isHexadecimal(it)) return undefined;
        let decrypted = '';
        try {
            const buf = Buffer.from(it, 'hex');
            decrypted = safeStorage.decryptString(buf);
        } catch {
            return undefined;
        }
        return decrypted;
    }
    /**
     * Encrypt a value
     * @param value The value to encrypt
     */
    encrypt(value: string) {
        return safeStorage.encryptString(value).toString('hex');
    }
}

/**
 * Wait for SafeStore to be ready
 * @param timeout Timeout in ms
 * @param poll Polling time in ms
 */
export function safeStoreWait(timeout = 10000, poll = 100) {
    return new Promise<void>((r, j) => {
        type _int = Parameters<typeof clearInterval>[0];
        let pollI: _int, timeI: _int;
        pollI = setInterval(() => {
            if (safeStorage.isEncryptionAvailable()) {
                clearInterval(pollI);
                clearTimeout(timeI);
                r();
            }
        }, poll);
        timeI = setTimeout(() => {
            if (safeStorage.isEncryptionAvailable()) {
                r();
            } else {
                clearInterval(pollI);
                clearTimeout(timeI);
                j('Timed out waiting for safeStorage');
            }
        }, timeout);
    });
}