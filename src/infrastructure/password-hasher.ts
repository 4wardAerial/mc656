import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Salted password hashing with scrypt (Node's built-in key derivation function), so the
 * tables never store plaintext and equal passwords produce different hashes.
 *
 * Stored format: `scrypt$<salt hex>$<derived key hex>`.
 */
const SCHEME = 'scrypt';
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const HASH_FORMAT = /^scrypt\$(?:[0-9a-f]{2})+\$(?:[0-9a-f]{2})+$/;

export function hashPassword(password: string): string {
    if (password.length === 0) {
        throw new Error('Password must be a non-empty string.');
    }
    const salt = randomBytes(SALT_BYTES);
    const key = scryptSync(password, salt, KEY_BYTES);
    return `${SCHEME}$${salt.toString('hex')}$${key.toString('hex')}`;
}

export function isPasswordHash(value: string): boolean {
    return HASH_FORMAT.test(value);
}

/** Constant-time comparison; returns false (never throws) for malformed stored hashes. */
export function verifyPassword(password: string, storedHash: string): boolean {
    if (!isPasswordHash(storedHash)) {
        return false;
    }
    const [, saltHex = '', keyHex = ''] = storedHash.split('$');
    const expected = Buffer.from(keyHex, 'hex');
    const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
    return timingSafeEqual(actual, expected);
}
