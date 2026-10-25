import { User } from './user.js';
import { SessionType } from './session-type.js'
import { VotingSession, SessionState } from './voting-session.js';
import { 
    type IVote,
    type ICandidate,
    ConclaveVote, 
    ONUVote, 
    CondominiumVote
} from './vote.js';

export type SessionMatrixEntry = [VotingSession, SessionType, string];

export class VotingController {
    private readonly sessions: SessionMatrixEntry[] = [];

    constructor(sessions: SessionMatrixEntry[] = []) {
        this.sessions = [...sessions];
    }

    private findSessionEntry(sessionId: string): SessionMatrixEntry {
        const entry = this.sessions.find(([session]) => session.getSessionId() === sessionId);
        if (!entry) {
            throw new Error(`Session with id ${sessionId} not found.`);
        }
        return entry;
    }

    private findSession(sessionId: string): VotingSession {
        return this.findSessionEntry(sessionId)[0];
    }

    // -=-=-=-=-=-=-=-=-=- State Machine Wrappers -=-=-=-=-=-=-=-=-=-

    public getState(sessionId: string): SessionState {
        return this.findSession(sessionId).getState();
    }

    public countVotes(sessionId: string): void {
        this.findSession(sessionId).countVotes();
    }

    public getResult(sessionId: string): boolean | string {
        return this.findSession(sessionId).getResult();
    }

    // -=-=-=-=-=-=-=-=-=- Session Lifecycle Management -=-=-=-=-=-=-=-=-=-

    public createSession(user: User, sessionType: SessionType, sessionId: string): void {

    }

    public deleteSession(user: User, sessionId: string): void {

    }

    public verifyAdminNotLinked(user: User): boolean {

    }

    // -=-=-=-=-=-=-=-=-=- Vote registration -=-=-=-=-=-=-=-=-=-

    public castVote(
        user: User, 
        voteValue: 'yes' | 'no' | 'abstention' | string | ICandidate, 
        sessionId: string
    ): void {
        // 1. Verify the user is not an Administrator and matches the correct session
        if (user.isAdmin) {
            throw new Error("Administrators cannot cast votes.");
        }

        const [session, sessionType] = this.findSessionEntry(sessionId)
        if (user.sessionType !== sessionType) {
            throw new Error(`User session type (${user.sessionType}) does not match session type (${sessionType}).`)
        }

        // 2. Construct the specific vote type based on the Administrator domain
        let vote: IVote;

        if (user.sessionType === SessionType.CONDOMINIUM) {
            vote = new CondominiumVote(
                user,
                user.attribute as number,
                voteValue as 'yes' | 'no' | 'abstention'
            );
        } else if (user.sessionType === SessionType.ONU) {
            vote = new ONUVote(
                user,
                voteValue as 'yes' | 'no' | 'abstention',
                user.attribute as boolean
            );
        } else if (user.sessionType === SessionType.CONCLAVE) {
            vote = new ConclaveVote(
                user,
                voteValue as string | ICandidate
            );
        } else {
            throw new Error("Unsupported session type.");
        }

        // 3. Delegate to the voting session (which also validates duplicate votes)
        session.registerVote(vote);
    }
}
