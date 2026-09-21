import { describe, it, expect } from 'vitest';
import { Voter } from './voter.js';

describe('Voter', () => {
    it('creates a valid voter', () => {
        const voter = new Voter('1', 'Ana');
        expect(voter.id).toBe('1');
        expect(voter.name).toBe('Ana');
    });

    it('throws an error if id is missing', () => {
        expect(() => new Voter('', 'Ana')).toThrow();
    });

    it('throws an error if name is empty', () => {
        expect(() => new Voter('1', '')).toThrow();
    });
});
