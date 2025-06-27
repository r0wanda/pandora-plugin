import { getStorage } from "@inrixia/lib/storage";
import { NativeSafeStore, safeStoreWait } from "./SafeStore.native"

const storage = getStorage<Record<string, string>>({});

export class SafeStore {
    native: NativeSafeStore;
    constructor() {
        // class can't extend NativeSafeStore because weird .native.ts bug
        this.native = new NativeSafeStore();
    }
    /**
     * Get an encrypted property from storage
     * @param key Property name to access
     * @returns The decrypted property or undefined if not found or invalid
     */
    getItem(key: string) {
        const it = storage[key];
        return this.native.decrypt(it);
    }
    /**
     * Encrypt and store a value
     * @param key Property name to store under
     * @param value The value to store
     */
    setItem(key: string, value: string) {
        storage[key] = this.native.encrypt(value);
    }
}

/**
 * Initialize an instance of SafeStore
 * @param timeout Timeout in ms
 * @param poll Polling time in ms
 */
export async function initSafeStore(timeout = 30000, poll = 100) {
    return await safeStoreWait(timeout, poll);
    return new SafeStore();
}
