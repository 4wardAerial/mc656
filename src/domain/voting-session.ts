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
    Tallying = 'Tallying',
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

    // -=-=-=-=-=-=-=-=-=- Voting Result -=-=-=-=-=-=-=-=-=-

    public getResult(): boolean {
        if (this.state !== SessionState.Result || this.isApproved === null) {
            throw new Error("Result is not available yet.");
        }
        return this.isApproved;
    }
}