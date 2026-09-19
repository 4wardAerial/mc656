import { Administrator } from './administrator.js';
import { Voter } from './voter.js';

export class CondominiumAdministrator extends Administrator {
    private readonly voterWeights: Map<string, number> = new Map();

    registerCondoMember(voter: Voter, idealFraction: number): void {
        this.registerVoter(voter);
        this.voterWeights.set(voter.id, idealFraction);
    }
}
