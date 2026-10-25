import {
    type IVote,
    ConclaveVote,
    ONUVote,
    CondominiumVote,
} from './vote.js';
import { SessionType } from './session-type.js';

// -=-=-=-=-=-=-=-=-=- Enums -=-=-=-=-=-=-=-=-=-

export enum SessionState {
    SETUP = 'SETUP',
    VOTING = 'VOTING',
    COUNTING = 'COUNTING',
    RESULT = 'RESULT'
}

// SessionType lives in its own module so users and sessions can share it; re-exported for existing imports.
export { SessionType };

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
        const isDuplicate = this.votes.some(v => v.voterId === vote.voterId);
        if (isDuplicate) {
            throw new Error(`Duplicate vote for voterId: ${vote.voterId}`);
        }
    }

    public getResult(): TResult {
        if (this.result === null) {
            throw new Error("Result is only available after Counting is complete.");
        }
        return this.result;
    }
}

// -=-=-=-=-=-=-=-=-=- Concrete Voting Session Classes -=-=-=-=-=-=-=-=-=-

export class ConclaveVotingSession extends VotingSession<ConclaveVote, string> {
    private candidates: string[];
    private currentCall: number;

    constructor(candidates: string[] = [], sessionId: string = '') {
        super(SessionType.CONCLAVE, sessionId);
        this.candidates = [];
        this.currentCall = 0;
        this.setCandidates(candidates);
    }

    public setCandidates(candidates: string[]): void {
        this.currentCall = 0;
        this.result = null;
        this.resetRound(candidates);
    }

    private resetRound(candidates: string[]): void {
        this.state = SessionState.SETUP;

        this.votes = [];
        this.candidates = candidates;

        this.state = SessionState.VOTING;
    }

    public getCandidates(): string[] {
        return [...this.candidates];
    }

    public getCurrentCall(): number {
        return this.currentCall;
    }

    public override registerVote(vote: ConclaveVote): void {
        if (vote === null || vote === undefined) {
            throw new Error("Vote cannot be null.");
        }
        if (this.state !== SessionState.VOTING) {
            throw new Error("Votes can only be registered during Voting state.");
        }
        if (this.candidates.length > 0 && !this.candidates.includes(vote.candidateName)) {
            throw new Error("Voted candidate is not one of the two most voted of the last call");
        }
        super.registerVote(vote);
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

        const voteCount = new Map<string, number>();
        const allVotes = this.votes.length;

        for (const vote of this.votes) {
            const numberOfVotes = voteCount.get(vote.candidateName) ?? 0;
            voteCount.set(vote.candidateName, numberOfVotes + 1);
        }

        const orderedCandidates = Array.from(voteCount.entries()).sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }
            return a[0].localeCompare(b[0]);
        });

        const mostVotedCandidate = orderedCandidates[0]![0];
        const mostVotedCandidateVotes = orderedCandidates[0]![1];

        if (this.currentCall < 3) {
            if (mostVotedCandidateVotes / allVotes >= 2 / 3) {
                this.result = mostVotedCandidate;
                this.state = SessionState.RESULT;
                return;
            }

            this.currentCall++;

            if (this.currentCall < 3) {
                this.resetRound(this.candidates);
            } else {
                const twoMostVoted = [orderedCandidates[0]![0], orderedCandidates[1]![0]];
                this.resetRound(twoMostVoted);
            }
        } else {
            // After 3 tries: criteria is voteCount > 50% and, in case of tie, alphabetical order
            this.result = mostVotedCandidate;
            this.state = SessionState.RESULT;
        }
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
        this.firstCall = true;
        this.result = null;
        this.resetRound(topic);
    }

    private resetRound(topic: string): void {
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
                this.resetRound(this.topic);
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
        this.result = null;

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
