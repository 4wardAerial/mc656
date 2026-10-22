import { describe, test, expect,} from 'vitest';
import { Administrator } from './administrator.js';
import { OnuAdministrator } from './onu-administrator.js';
import { CondominiumAdministrator } from './condominium-administrator.js';
import { VotingSession, SessionState } from './voting-session.js';
import { Voter } from './voter.js';
import { VotingController } from './voting-controller.js';
import {
    type ICountingStrategy,
    type IVote,
    type ICandidate,
    ONUVote,
    CondominiumVote
} from './vote.js';

describe('VotingController', () => {

    // Helper to create a dummy strategy based on voting-session.test.ts
    const createMockStrategy = <T extends IVote>(): ICountingStrategy<T, boolean> => ({
        calculate: () => true
    });

    describe('Constructor and State Wrappers', () => {

        test('should throw an error if missing dependencies', () => {
            // @ts-expect-error Forcing error to ensure null guard works
            expect(() => new VotingController(null, null)).toThrow();
        });

        test('should advance the underlying session state', () => {
            const admin = new Administrator('admin-1');
            const session = new VotingSession(createMockStrategy());
            const controller = new VotingController(admin, session);

            // Verifying the controller wrappers successfully drive the VotingSession state machine
            expect(controller.getState()).toBe(SessionState.Setup);
            
            controller.openSession();
            expect(controller.getState()).toBe(SessionState.Opening);
            
            controller.startVoting();
            expect(controller.getState()).toBe(SessionState.Voting);
            
            controller.closeVoting();
            expect(controller.getState()).toBe(SessionState.Closing);
            
            controller.countVotes();
            expect(controller.getState()).toBe(SessionState.Result);
            expect(controller.getResult()).toBe(true);
        });
    });

    describe('Core Voting Logic (castVote)', () => {
        
        test('should throw an error when casting a vote for an unregistered voter', () => {
            const admin = new Administrator('admin-1');
            const session = new VotingSession(createMockStrategy());
            const controller = new VotingController(admin, session);

            controller.openSession();
            controller.startVoting();

            expect(() => controller.castVote('unregistered-voter', 'yes')).toThrow(
                'Voter with id unregistered-voter is not registered.'
            );
        });

        test('should throw an error when the same voter attempts to vote twice', () => {
            const admin = new Administrator('admin-1');
            const voter = new Voter('v1', 'Frare');
            admin.registerVoter(voter);

            const session = new VotingSession(createMockStrategy());
            const controller = new VotingController(admin, session);

            controller.openSession();
            controller.startVoting();

            // First vote should succeed
            controller.castVote('v1', 'yes');

            // Second vote should trigger the duplicate error from vote.ts
            expect(() => controller.castVote('v1', 'no')).toThrow(
                'Duplicate vote for voterId: v1'
            );
        });

        test('should successfully register a Conclave/generic vote', () => {
            const admin = new Administrator('admin-1');
            const voter = new Voter('v1', 'Leonardo');
            admin.registerVoter(voter);

            // Extracting the votes array via a custom strategy to verify the data
            let capturedVotes: IVote[] = [];
            const strategy: ICountingStrategy<IVote, boolean> = {
                calculate: (votes) => {
                    capturedVotes = votes;
                    return true;
                }
            };

            const session = new VotingSession(strategy);
            const controller = new VotingController(admin, session);

            controller.openSession();
            controller.startVoting();

            const candidate: ICandidate = { candidateId: 'c1', name: 'Lucas' };
            controller.castVote('v1', candidate);

            controller.closeVoting();
            controller.countVotes();

            expect(capturedVotes.length).toBe(1);
            expect(capturedVotes[0]!.voterId).toBe('v1');
        });
    });

    describe('Domain-Specific Vote Construction', () => {

        test('should fetch permanent status and build ONUVote when using OnuAdministrator', () => {
            const admin = new OnuAdministrator('onu-admin');
            const voter = new Voter('v1', 'Victor');
            // Registering as a permanent member
            admin.registerMemberState(voter, true);

            let capturedVotes: ONUVote[] = [];
            const strategy: ICountingStrategy<ONUVote, boolean> = {
                calculate: (votes) => {
                    capturedVotes = votes;
                    return true;
                }
            };

            const session = new VotingSession(strategy);
            const controller = new VotingController(admin, session);

            controller.openSession();
            controller.startVoting();
            controller.castVote('v1', 'yes');
            controller.closeVoting();
            controller.countVotes();

            expect(capturedVotes.length).toBe(1);
            expect(capturedVotes[0]!).toBeInstanceOf(ONUVote);
            expect(capturedVotes[0]!.isPermanentMember).toBe(true);
            expect(capturedVotes[0]!.value).toBe('yes');
        });

        test('should fetch weight and build CondominiumVote when using CondominiumAdministrator', () => {
            const admin = new CondominiumAdministrator('condo-admin');
            const voter = new Voter('v1', 'Apartment 101');
            const voterWeight = 0.45;
            
            admin.registerCondoMember(voter, voterWeight);

            let capturedVotes: CondominiumVote[] = [];
            const strategy: ICountingStrategy<CondominiumVote, boolean> = {
                calculate: (votes) => {
                    capturedVotes = votes;
                    return true;
                }
            };

            const session = new VotingSession(strategy);
            const controller = new VotingController(admin, session);

            controller.openSession();
            controller.startVoting();
            controller.castVote('v1', 'no');
            controller.closeVoting();
            controller.countVotes();

            expect(capturedVotes.length).toBe(1);
            expect(capturedVotes[0]!).toBeInstanceOf(CondominiumVote);
            expect(capturedVotes[0]!.weight).toBe(0.45);
            expect(capturedVotes[0]!.value).toBe('no');
        });

        test('should throw an error if a condominium voter has no weight assigned', () => {
            const admin = new CondominiumAdministrator('condo-admin');
            const voter = new Voter('v1', 'Apartment 102');
            
            // Registering the voter directly via the base class method, bypassing the weight assignment
            admin.registerVoter(voter);

            const session = new VotingSession(createMockStrategy());
            const controller = new VotingController(admin, session);

            controller.openSession();
            controller.startVoting();

            expect(() => controller.castVote('v1', 'yes')).toThrow(
                'Weight not found for Condominium voter v1'
            );
        });
    });

});