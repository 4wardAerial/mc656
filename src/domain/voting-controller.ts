import { Administrator } from './administrator.js';
import { CondominiumAdministrator } from './condominium-administrator.js';
import { OnuAdministrator } from './onu-administrator.js';
import { VotingSession, SessionState } from './voting-session.js';
import { 
    type IVote, 
    ConclaveVote, 
    ONUVote, 
    CondominiumVote, 
    validateNoDuplicateVote 
} from './vote.js';

export class VotingController<TVote extends IVote, TResult> {
    private readonly admin: Administrator;
    private readonly session: VotingSession<TVote, TResult>;
    private readonly recordedVotes: TVote[]; // Tracked locally for duplicate validation

    constructor(admin: Administrator, session: VotingSession<TVote, TResult>) {
        if (!admin || !session) {
            throw new Error("Administrator and VotingSession are required.");
        }
        this.admin = admin;
        this.session = session;
        this.recordedVotes = [];
    }

    // -=-=-=-=-=-=-=-=-=- State Machine Wrappers -=-=-=-=-=-=-=-=-=-

    public getState(): SessionState {
        return this.session.getState();
    }

    public openSession(): void {
        this.session.openSession();
    }

    public startVoting(): void {
        this.session.startVoting();
    }

    public closeVoting(): void {
        this.session.closeVoting();
    }

    public countVotes(): void {
        this.session.countVotes();
    }

    public getResult(): TResult {
        return this.session.getResult();
    }

    // -=-=-=-=-=-=-=-=-=- Core Logic -=-=-=-=-=-=-=-=-=-

    public castVote(voterId: string, value: any): void {
        // 1. Verify the voter is registered with the Administrator
        const isRegistered = this.admin.listRegisteredVoters().some(voter => voter.id === voterId);
        if (!isRegistered) {
            throw new Error(`Voter with id ${voterId} is not registered.`);
        }

        // 2. Ensure the voter hasn't already voted
        validateNoDuplicateVote(this.recordedVotes, voterId);

        // 3. Construct the specific vote type based on the Administrator domain
        let vote: TVote;

        if (this.admin instanceof CondominiumAdministrator) {
            const weight = this.admin.getVoteWeight(voterId);
            if (weight === undefined) {
                throw new Error(`Weight not found for Condominium voter ${voterId}`);
            }
            vote = new CondominiumVote(voterId, weight, value) as unknown as TVote;
            
        } else if (this.admin instanceof OnuAdministrator) {
            const isPermanent = this.admin.isPermanentMember(voterId);
            vote = new ONUVote(voterId, value, isPermanent) as unknown as TVote;

        } else {
            // Default fallback for Conclave or generic votes
            vote = new ConclaveVote(voterId, value) as unknown as TVote;
        }

        // 4. Delegate to the voting session and record it locally
        this.session.registerVote(vote);
        this.recordedVotes.push(vote);
    }
}