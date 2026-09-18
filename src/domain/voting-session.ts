import { type ICandidate, type IVote, type ICountingStrategy } from './vote';

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

export class VotingSession<
    TVote extends IVote = IVote,
    TResult = boolean | ICandidate
> {
    private state: SessionState;
    private votes: TVote[];
    private strategy: ICountingStrategy<TVote, TResult>;
    private result: TResult | null;

    constructor(strategy: ICountingStrategy<TVote, TResult>) {
        if (strategy === null) {
            throw new Error("Strategy cannot be null.");
        }

        this.state = SessionState.Setup;
        this.votes = [];
        this.strategy = strategy;
        this.result = null;
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

        this.result = this.strategy.calculate(this.votes);

        this.state = SessionState.Result;
    }

    // -=-=-=-=-=-=-=-=-=- Register Vote -=-=-=-=-=-=-=-=-=-

    public registerVote(vote: TVote): void {
        if (vote === null) {
            throw new Error("Vote cannot be null.");
        }
        if (this.state !== SessionState.Voting) {
            throw new Error("Votes can only be registered during Voting state.");
        }
        this.votes.push(vote);
    }

    // -=-=-=-=-=-=-=-=-=- Voting Result -=-=-=-=-=-=-=-=-=-

    public getResult(): TResult {
        if (this.state !== SessionState.Result || this.result === null) {
            throw new Error("Result is only available after Counting is complete.");
        }
        return this.result;
    }
}