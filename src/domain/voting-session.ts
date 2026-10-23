import {
    type IVote,
    ConclaveVote,
    ONUVote,
    CondominiumVote,
    validateNoDuplicateVote
} from './vote.js';

// -=-=-=-=-=-=-=-=-=- Enums -=-=-=-=-=-=-=-=-=-

export enum SessionState {
    SETUP = 'SETUP',
    VOTING = 'VOTING',
    COUNTING = 'COUNTING',
    RESULT = 'RESULT'
}

export enum SessionType {
    CONCLAVE = 'CONCLAVE',
    CONDOMINIUM = 'CONDOMINIUM',
    ONU = 'ONU'
}

// -=-=-=-=-=-=-=-=-=- Abstract Voting Session Class -=-=-=-=-=-=-=-=-=-

export abstract class VotingSession<
    TVote extends IVote = IVote,
    TResult = boolean | string
> {
    protected readonly sessionType: SessionType;
    protected readonly sessionId: string;
    protected state: SessionState;
    protected votes: TVote[];
    protected result: TResult | null;

    constructor(sessionType: SessionType, sessionId: string = '') {
        this.sessionType = sessionType;
        this.sessionId = sessionId;
        this.state = SessionState.SETUP;
        this.votes = [];
        this.result = null;
    }

    public getState(): SessionState {
        return this.state;
    }

    public getSessionType(): SessionType {
        return this.sessionType;
    }

    public getSessionId(): string {
        return this.sessionId;
    }

    // -=-=-=-=-=-=-=-=-=- Core Session Operations -=-=-=-=-=-=-=-=-=-

    public abstract countVotes(): void;

    public registerVote(vote: TVote): void {
        if (vote === null || vote === undefined) {
            throw new Error("Vote cannot be null.");
        }
        if (this.state !== SessionState.VOTING) {
            throw new Error("Votes can only be registered during Voting state.");
        }
        this.validateNoDuplicateVote(vote);
        this.votes.push(vote);
    }

    protected validateNoDuplicateVote(vote: TVote): void {
        validateNoDuplicateVote(this.votes, vote.voterId);
    }

    public getResult(): TResult {
        if (this.result === null) {
            throw new Error("Result is only available after Counting is complete.");
        }
        return this.result;
    }
}