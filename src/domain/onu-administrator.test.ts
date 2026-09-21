import { describe, it, expect } from 'vitest';
import { OnuAdministrator } from './onu-administrator.js';
import { Voter } from './voter.js';

describe('OnuAdministrator', () => {
    it('registers a permanent member', () => {
        const admin = new OnuAdministrator('1');
        const voter = new Voter('v1', 'USA');
        admin.registerMemberState(voter, true);

        expect(admin.isPermanentMember('v1')).toBe(true);
    });

    it('registers a non-permanent member', () => {
        const admin = new OnuAdministrator('1');
        const voter = new Voter('v1', 'Brazil');
        admin.registerMemberState(voter, false);

        expect(admin.isPermanentMember('v1')).toBe(false);
    });

    it('returns false for an unregistered voter', () => {
        const admin = new OnuAdministrator('1');
        expect(admin.isPermanentMember('missing')).toBe(false);
    });
});
