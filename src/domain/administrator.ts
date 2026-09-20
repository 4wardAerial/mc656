import { Voter } from './voter.js';

export class Administrator {
    readonly id: string;
    private readonly registeredVoters: Map<string, Voter> = new Map();
    private votingOpen = false;

    constructor(id: string) {
        if (!id || id.trim().length === 0) {
            throw new Error('Administrator must have a valid id.');
        }

        this.id = id;
    }

    registerVoter(voter: Voter): void {
        if (this.registeredVoters.has(voter.id)) {
            throw new Error('Voter with id ${voter.id} is already registered.');
        }
        this.registeredVoters.set(voter.id, voter);
    }

    listRegisteredVoters(): Voter[] {
        return Array.from(this.registeredVoters.values());
    }

    authorizeVotingOpening(): void {
        if (this.votingOpen) {
            throw new Error('Voting is already open.');
        }
        this.votingOpen = true;
    }

    authorizeVotingClosing(): void {
        if (!this.votingOpen) {
            throw new Error('There is no open voting to close.');
        }
        this.votingOpen = false;
    }

    isVotingOpen(): boolean {
        return this.votingOpen;
    }
}