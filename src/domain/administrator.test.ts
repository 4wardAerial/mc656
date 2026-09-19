import { describe, it, expect } from 'vitest';
import { Administrator } from './administrator.js';
import { Voter } from './voter.js';

describe('Administrator', () => {
    it('creates a valid administrator', () => {
        const admin = new Administrator('1');
        expect(admin.id).toBe('1');
    });

    it('throws an error if id is missing', () => {
        expect(() => new Administrator('')).toThrow();
    });

    it('registers a voter', () => {
        const admin = new Administrator('1');
        const voter = new Voter('v1', 'Maria');
        admin.registerVoter(voter);
        expect(admin.listRegisteredVoters()).toEqual([voter]);
    });

    it('throws an error when registering a voter with a duplicate id', () => {
        const admin = new Administrator('1');
        const voter = new Voter('v1', 'Maria');
        admin.registerVoter(voter);
        expect(() => admin.registerVoter(voter)).toThrow();
    });

    it('opens voting', () => {
        const admin = new Administrator('1');
        admin.authorizeVotingOpening();
        expect(admin.isVotingOpen()).toBe(true);
    });

    it('throws an error when trying to open voting that is already open', () => {
        const admin = new Administrator('1');
        admin.authorizeVotingOpening();
        expect(() => admin.authorizeVotingOpening()).toThrow();
    });

    it('closes voting', () => {
        const admin = new Administrator('1');
        admin.authorizeVotingOpening();
        admin.authorizeVotingClosing();
        expect(admin.isVotingOpen()).toBe(false);
    });

    it('throws an error when trying to close voting that is not open', () => {
        const admin = new Administrator('1');
        expect(() => admin.authorizeVotingClosing()).toThrow();
    });
});