import { Administrator } from './administrator.js';
import { CondominiumAdministrator } from './condominium-administrator.js';
import { OnuAdministrator } from './onu-administrator.js';
import { VotingSession, SessionState, SessionType } from './voting-session.js';
import { 
    type IVote,
    type ICandidate,
    ConclaveVote, 
    ONUVote, 
    CondominiumVote
} from './vote.js';

export class VotingController<TVote extends IVote, TResult> {
    private readonly admin: Administrator;
    private readonly sessions: Array<[VotingSession<TVote, TResult>, SessionType, string]> = [];

    private findSession(sessionId: string): VotingSession<TVote, TResult> {
        const entry = this.sessions.find(([session]) => session.getSessionId() === sessionId);
        if (!entry) {
            throw new Error(`Session with id ${sessionId} not found.`);
        }
        return entry[0];
    }

    constructor(admin: Administrator, sessions: Array<[VotingSession<TVote, TResult>, SessionType, string]>) {
        if (!admin || !sessions || sessions.length === 0) {
            throw new Error("Administrator and VotingSessions are required.");
        }
        this.admin = admin;
        this.sessions = sessions;
    }

    // -=-=-=-=-=-=-=-=-=- State Machine Wrappers -=-=-=-=-=-=-=-=-=-

    public getState(sessionId: string): SessionState {
        return this.findSession(sessionId).getState();
    }

    public countVotes(sessionId: string): void {
        this.findSession(sessionId).countVotes();
    }

    public getResult(sessionId: string): TResult {
        return this.findSession(sessionId).getResult();
    }

    // -=-=-=-=-=-=-=-=-=- Core Logic -=-=-=-=-=-=-=-=-=-

    public castVote(voterId: string, value: 'yes' | 'no' | 'abstention' | string | ICandidate, sessionId: string): void {
        // 1. Verify the voter is registered with the Administrator
        const isRegistered = this.admin.listRegisteredVoters().some(voter => voter.id === voterId);
        if (!isRegistered) {
            throw new Error(`Voter with id ${voterId} is not registered.`);
        }

        // 2. Construct the specific vote type based on the Administrator domain
        let vote: TVote;

        if (this.admin instanceof CondominiumAdministrator) {
            const weight = this.admin.getVoteWeight(voterId);
            if (weight === undefined) {
                throw new Error(`Weight not found for Condominium voter ${voterId}`);
            }
            vote = new CondominiumVote(voterId, weight, value as 'yes' | 'no' | 'abstention') as unknown as TVote;
            
        } else if (this.admin instanceof OnuAdministrator) {
            const isPermanent = this.admin.isPermanentMember(voterId);
            vote = new ONUVote(voterId, value as 'yes' | 'no' | 'abstention', isPermanent) as unknown as TVote;

        } else {
            vote = new ConclaveVote(voterId, value as string | ICandidate) as unknown as TVote;
        }

        // 3. Delegate to the voting session (which also validates duplicate votes)
        this.findSession(sessionId).registerVote(vote);
    }

    public createSession(sessionType: SessionType, sessionId: string): void {

    }

    public deleteSession(sessionId: string): void {

    }

    public verifyAdminNotLinked(): boolean {

    }
}
