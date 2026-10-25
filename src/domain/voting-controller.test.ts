import { describe, test, expect } from 'vitest';
import { Administrator } from './administrator.js';
import { OnuAdministrator } from './onu-administrator.js';
import { CondominiumAdministrator } from './condominium-administrator.js';
import {
    ConclaveVotingSession,
    CondominiumVotingSession,
    ONUVotingSession,
    SessionState
} from './voting-session.js';
import { Voter } from './voter.js';
import { VotingController } from './voting-controller.js';

describe('VotingController', () => {

    describe('Constructor and State Wrappers', () => {

        test('should throw an error if missing dependencies', () => {
            // @ts-expect-error Forcing error to ensure null guard works
            expect(() => new VotingController(null, null)).toThrow();
        });

        test('should advance the underlying session state', () => {
            const admin = new Administrator('admin-1');
            const voter = new Voter('v1', 'Leonardo');
            admin.registerVoter(voter);

            const session = new ConclaveVotingSession(['Lucas', 'Victor']);
            const controller = new VotingController(admin, session);

            expect(controller.getState()).toBe(SessionState.VOTING);

            controller.castVote('v1', 'Lucas');
            controller.countVotes();

            expect(controller.getState()).toBe(SessionState.RESULT);
            expect(controller.getResult()).toBe('Lucas');
        });
    });

    describe('Core Voting Logic (castVote)', () => {

        test('should throw an error when casting a vote for an unregistered voter', () => {
            const admin = new Administrator('admin-1');
            const session = new ConclaveVotingSession(['Lucas']);
            const controller = new VotingController(admin, session);

            expect(() => controller.castVote('unregistered-voter', 'Lucas')).toThrow(
                'Voter with id unregistered-voter is not registered.'
            );
        });

        test('should throw an error when the same voter attempts to vote twice', () => {
            const admin = new Administrator('admin-1');
            const voter = new Voter('v1', 'Frare');
            admin.registerVoter(voter);

            const session = new ConclaveVotingSession(['Lucas', 'Victor']);
            const controller = new VotingController(admin, session);

            // First vote should succeed
            controller.castVote('v1', 'Lucas');

            // Second vote should trigger the duplicate error from vote.ts
            expect(() => controller.castVote('v1', 'Victor')).toThrow(
                'Duplicate vote for voterId: v1'
            );
        });

        test('should successfully register a Conclave vote', () => {
            const admin = new Administrator('admin-1');
            const voter = new Voter('v1', 'Leonardo');
            admin.registerVoter(voter);

            const session = new ConclaveVotingSession(['Lucas', 'Victor']);
            const controller = new VotingController(admin, session);

            controller.castVote('v1', 'Lucas');
            controller.countVotes();

            expect(controller.getState()).toBe(SessionState.RESULT);
            expect(controller.getResult()).toBe('Lucas');
        });
    });

    describe('Domain-Specific Vote Construction', () => {

        test('should fetch permanent status and build ONUVote when using OnuAdministrator', () => {
            const admin = new OnuAdministrator('onu-admin');
            const voter = new Voter('v1', 'Victor');
            // Registering as a permanent member
            admin.registerMemberState(voter, true);

            const session = new ONUVotingSession('Peace Resolution');
            const controller = new VotingController(admin, session);

            // Permanent member voting 'no' triggers immediate veto
            controller.castVote('v1', 'no');
            controller.countVotes();

            expect(controller.getState()).toBe(SessionState.RESULT);
            expect(controller.getResult()).toBe(false);
        });

        test('should fetch weight and build CondominiumVote when using CondominiumAdministrator', () => {
            const admin = new CondominiumAdministrator('condo-admin');
            const voter = new Voter('v1', 'Apartment 101');
            const voterWeight = 0.60;

            admin.registerCondoMember(voter, voterWeight);

            const session = new CondominiumVotingSession('Facade Painting');
            const controller = new VotingController(admin, session);

            controller.castVote('v1', 'yes');
            controller.countVotes();

            expect(controller.getState()).toBe(SessionState.RESULT);
            expect(controller.getResult()).toBe(true);
        });

        test('should throw an error if a condominium voter has no weight assigned', () => {
            const admin = new CondominiumAdministrator('condo-admin');
            const voter = new Voter('v1', 'Apartment 102');

            // Registering the voter directly via the base class method, bypassing the weight assignment
            admin.registerVoter(voter);

            const session = new CondominiumVotingSession('Elevator Maintenance');
            const controller = new VotingController(admin, session);

            expect(() => controller.castVote('v1', 'yes')).toThrow(
                'Weight not found for Condominium voter v1'
            );
        });
    });

});
