import { Administrator } from './administrator.js';
import { Voter } from './voter.js';

export class OnuAdministrator extends Administrator {
    private readonly permanentMembers: Set<string> = new Set();

    registerMemberState(voter: Voter, isPermanent: boolean): void {
        this.registerVoter(voter);
        if (isPermanent) {
            this.permanentMembers.add(voter.id);
        }
    }

    isPermanentMember(voterId: string): boolean {
        return this.permanentMembers.has(voterId);
    }
}
