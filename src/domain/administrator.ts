import { Voter } from './voter.js';

export class Administrator {
    readonly id: string;
    private readonly registeredVoters: Map<string, Voter> = new Map();

    constructor(id: string) {
        if (!id || id.trim().length === 0) {
            throw new Error('Administrator must have a valid id.');
        }

        this.id = id;
    }

    registerVoter(voter: Voter): void {
        this.registeredVoters.set(voter.id, voter);
    }

    listRegisteredVoters(): Voter[] {
        return Array.from(this.registeredVoters.values());
    }
}