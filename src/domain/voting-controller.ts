import { Administrator } from './administrator.js';
import { CondominiumAdministrator } from './condominium-administrator.js';
import { OnuAdministrator } from './onu-administrator.js';
import { VotingSession, SessionState } from './voting-session.js';
import { 
    type IVote,
    type ICandidate,
    ConclaveVote, 
    ONUVote, 
    CondominiumVote
} from './vote.js';

export class VotingController<TVote extends IVote, TResult> {
    private readonly admin: Administrator;
    private readonly session: VotingSession<TVote, TResult>;

    constructor(admin: Administrator, session: VotingSession<TVote, TResult>) {
        if (!admin || !session) {
            throw new Error("Administrator and VotingSession are required.");
        }
        this.admin = admin;
        this.session = session;
    }

    // -=-=-=-=-=-=-=-=-=- State Machine Wrappers -=-=-=-=-=-=-=-=-=-

    public getState(): SessionState {
        return this.session.getState();
    }

    public countVotes(): void {
        this.session.countVotes();
    }

    public getResult(): TResult {
        return this.session.getResult();
    }

    // -=-=-=-=-=-=-=-=-=- Core Logic -=-=-=-=-=-=-=-=-=-

    public castVote(voterId: string, value: 'yes' | 'no' | 'abstention' | string | ICandidate): void {
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
        this.session.registerVote(vote);
    }
}
