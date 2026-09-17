// -=-=-=-=-=-=-=-=-=- Temp Agreed Interfaces -=-=-=-=-=-=-=-=-=-

export interface IVote {
    voterID: string;
    weight: number;
    value: 'yes' | 'no' | 'abstention';
}

export interface ICountingStrategy {
    calculate(votes: IVote[]): boolean;
}

// -=-=-=-=-=-=-=-=-=- Voting Session Class -=-=-=-=-=-=-=-=-=-

// Possible states
export enum SessionState {
    Setup = 'Setup',
    Opening = 'Opening',
    Voting = 'Voting',
    Closing = 'Closing',
    Counting = 'Counting',
    Result = 'Result'
}

export class VotingSession {
    private state: SessionState;
    private votes: IVote[];
    private strategy: ICountingStrategy;
    private isApproved: boolean | null;

    constructor(strategy: ICountingStrategy) {
        if (strategy === null) {
            throw new Error("Strategy cannot be null.");
        }

        this.state = SessionState.Setup;
        this.votes = [];
        this.strategy = strategy;
        this.isApproved = null;
    }

    public getState(): SessionState {
        return this.state;
    }

    // -=-=-=-=-=-=-=-=-=- State Machine -=-=-=-=-=-=-=-=-=-
    
    public openSession(): void {
        if (this.state !== SessionState.Setup) {
            throw new Error("Session has already been opened once.");
        }
        this.state = SessionState.Opening;
    }

    public startVoting(): void {
        if (this.state !== SessionState.Opening) {
            throw new Error("Session can only start Voting right after Opening.");
        }
        this.state = SessionState.Voting;
    }

    public closeVoting(): void {
        if (this.state !== SessionState.Voting) {
            throw new Error("Session can only be closed right after Voting.")
        }
        this.state = SessionState.Closing;
    }

    public countVotes(): void {
        if (this.state !== SessionState.Closing) {
            throw new Error("Session can only start Counting right after being closed.");
        }
        this.state = SessionState.Counting;

        this.isApproved = this.strategy.calculate(this.votes);

        this.state = SessionState.Result;
    }

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
            throw new Error("Result is only available after Counting is complete.");
        }
        return this.isApproved;
    }
}