import { describe, it, expect } from 'vitest';
import { hashPassword, isPasswordHash, verifyPassword } from './password-hasher.js';

describe('password hashing', () => {
    it('accepts only the exact original password', () => {
        const hash = hashPassword('correct horse');

        expect(verifyPassword('correct horse', hash)).toBe(true);
        expect(verifyPassword('correct hors', hash)).toBe(false);
        expect(verifyPassword('Correct horse', hash)).toBe(false);
        expect(verifyPassword('correct horse ', hash)).toBe(false);
    });

    it('never stores the password and salts every hash', () => {
        const first = hashPassword('secret');
        const second = hashPassword('secret');

        expect(first).not.toContain('secret');
        expect(first).not.toBe(second);
        expect(verifyPassword('secret', first)).toBe(true);
        expect(verifyPassword('secret', second)).toBe(true);
    });

    it('produces hashes that are safe to store in a CSV cell', () => {
        const hash = hashPassword('a,b"c\nd');

        expect(hash).not.toMatch(/[,"\r\n]/);
        expect(verifyPassword('a,b"c\nd', hash)).toBe(true);
    });

    it('rejects a tampered salt or key', () => {
        const [scheme, salt = '', key = ''] = hashPassword('secret').split('$');
        const flip = (hex: string): string => (hex[0] === '0' ? '1' : '0') + hex.slice(1);

        expect(verifyPassword('secret', `${scheme}$${flip(salt)}$${key}`)).toBe(false);
        expect(verifyPassword('secret', `${scheme}$${salt}$${flip(key)}`)).toBe(false);
    });

    it('treats malformed stored hashes as a failed match instead of crashing', () => {
        for (const stored of ['secret', '', 'scrypt$$', 'scrypt$abc$0d', 'bcrypt$00$00', 'scrypt$00$0g']) {
            expect(isPasswordHash(stored)).toBe(false);
            expect(verifyPassword('secret', stored)).toBe(false);
        }
    });

    it('refuses an empty password', () => {
        expect(() => hashPassword('')).toThrow('Password must be a non-empty string.');
    });
});
