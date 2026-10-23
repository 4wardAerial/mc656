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

export class CondominiumVotingSession extends VotingSession<CondominiumVote, boolean> {
    private topic: string;
    private firstCall: boolean;

    constructor(topic: string = '', sessionId: string = '') {
        super(SessionType.CONDOMINIUM, sessionId);
        this.topic = '';
        this.firstCall = true;
        this.setTopic(topic);
    }

    public setTopic(topic: string): void {
        this.state = SessionState.SETUP;

        this.votes = [];
        this.topic = topic;

        this.state = SessionState.VOTING;
    }

    public getTopic(): string {
        return this.topic;
    }

    public override countVotes(): void {
        if (this.state !== SessionState.VOTING) {
            throw new Error("Session can only start Counting right after Voting.");
        }
        this.state = SessionState.COUNTING;

        if (this.votes.length === 0) {
            this.state = SessionState.VOTING;
            throw new Error("Number of Votes must not be 0");
        }

        let totalWeightAll = 0;
        let yesWeightAll = 0;

        for (const vote of this.votes) {
            if (vote.value === 'yes') {
                yesWeightAll += vote.weight;
            }
            totalWeightAll += vote.weight;
        }

        if (this.firstCall) {
            this.firstCall = false;
            this.result = yesWeightAll > 0.5;
            if (this.result) {
                this.state = SessionState.RESULT;
            } else {
                this.setTopic(this.topic);
            }
        } else {
            this.result = yesWeightAll > totalWeightAll / 2;
            this.state = SessionState.RESULT;
        }
    }
}

export { CondominiumVotingSession as CondominiumVoteSession };

export class ONUVotingSession extends VotingSession<ONUVote, boolean> {
    private topic: string;

    constructor(topic: string = '', sessionId: string = '') {
        super(SessionType.ONU, sessionId);
        this.topic = '';
        this.setTopic(topic);
    }

    public setTopic(topic: string): void {
        this.state = SessionState.SETUP;

        this.votes = [];
        this.topic = topic;

        this.state = SessionState.VOTING;
    }

    public getTopic(): string {
        return this.topic;
    }

    public override countVotes(): void {
        if (this.state !== SessionState.VOTING) {
            throw new Error("Session can only start Counting right after Voting.");
        }
        this.state = SessionState.COUNTING;

        if (this.votes.length === 0) {
            this.state = SessionState.VOTING;
            throw new Error("Number of Votes must not be 0");
        }

        const numberVoters = this.votes.length;
        let yesCount = 0;

        for (const vote of this.votes) {
            if (vote.isPermanentMember && vote.value === 'no') {
                this.result = false;
                this.state = SessionState.RESULT;
                return;
            } else if (vote.value === 'yes') {
                yesCount++;
            }
        }

        if (yesCount < 9 || yesCount <= numberVoters / 2) {
            this.result = false;
        } else {
            this.result = true;
        }

        this.state = SessionState.RESULT;
    }
}
