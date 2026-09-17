// -=-=-=-=-=-=-=-=-=- Temp Agreed Interfaces -=-=-=-=-=-=-=-=-=-

export interface IVote {
    voterID: string;
    weight: number;
    value: 'yes' | 'no' | 'abstention';
}

export interface ICountingStrategy {
    calculaate(votes: IVote[]): boolean;
}

export enum SessionState {
    Setup = 'Setup',
    Opening = 'Opening',
    Voting = 'Voting',
    Closing = 'Closing',
    Tallying = 'Counting',
    Result = 'Result'
}

// -=-=-=-=-=-=-=-=-=- Voting Session Class -=-=-=-=-=-=-=-=-=-

export class VotingSession {
    private state: SessionState;
    private votes: IVote[];
    private strategy: ICountingStrategy;
    private isApproved: boolean | null;

    // Possible states
    constructor(strategy: ICountingStrategy) {
        this.state = SessionState.Setup;
        this.votes = [];
        this.strategy = strategy;
        this.isApproved = null;
    }

    // -=-=-=-=-=-=-=-=-=- State Machine -=-=-=-=-=-=-=-=-=-

    // -=-=-=-=-=-=-=-=-=- Register Vote -=-=-=-=-=-=-=-=-=-

    public registerVote(vote: IVote): void {
        if (vote === null) {
            throw new Error("Vote cannot be null.");
        }
        if (this.state !== SessionState.Voting) {
            throw new Error("Votes can only be registered during Voting state.");
        }
        this.votes.push(vote);
    }

    // -=-=-=-=-=-=-=-=-=- Voting Result -=-=-=-=-=-=-=-=-=-

    public getResult(): boolean {
        if (this.state !== SessionState.Result || this.isApproved === null) {
            throw new Error("Result is not available yet.");
        }
        return this.isApproved;
    }
}