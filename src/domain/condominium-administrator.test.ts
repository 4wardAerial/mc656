import { describe, it, expect } from 'vitest';
import { CondominiumAdministrator } from './condominium-administrator.js';
import { Voter } from './voter.js';

describe('CondominiumAdministrator', () => {
  it('registers a condo member and stores their ideal fraction', () => {
    const admin = new CondominiumAdministrator('1');
    const voter = new Voter('v1', 'Carlos');
    admin.registerCondoMember(voter, 0.05);

    expect(admin.getVoteWeight('v1')).toBe(0.05);
  });

  it('returns undefined for an unregistered voter', () => {
    const admin = new CondominiumAdministrator('1');
    expect(admin.getVoteWeight('missing')).toBeUndefined();
  });
});
