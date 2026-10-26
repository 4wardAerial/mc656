import { describe, test, expect, beforeEach } from 'vitest';
import {
    SessionState,
    SessionType,
} from './voting-session.js';
import { VotingController } from './voting-controller.js';
import { User } from './user.js';

describe('VotingController', () => {
    let controller: VotingController;
    let admin: User;
    let otherAdmin: User;
    let conclaveVoter: User;
    let condoVoter: User;
    let onuVoter: User;

    beforeEach(() => {
        controller = new VotingController();
        admin = User.admin('admin-1');
        otherAdmin = User.admin('admin-2');

        conclaveVoter = User.voter('v1', { sessionType: SessionType.CONCLAVE, attribute: null });
        condoVoter = User.voter('v2', { sessionType: SessionType.CONDOMINIUM, attribute: 0.6 });
        onuVoter = User.voter('v3', { sessionType: SessionType.ONU, attribute: true });
    });

    describe('Session Management & Lifecycle', () => {
        test('should allow administrator to create sessions with setupData', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-1', ['Candidate A', 'Candidate B']);
            expect(controller.getState('sess-1')).toBe(SessionState.VOTING);

            controller.createSession(admin, SessionType.CONDOMINIUM, 'sess-2', 'Pool Reform');
            expect(controller.getState('sess-2')).toBe(SessionState.VOTING);

            controller.createSession(admin, SessionType.ONU, 'sess-3', 'Resolution 42');
            expect(controller.getState('sess-3')).toBe(SessionState.VOTING);
        });

        test('should throw error when non-admin tries to create a session', () => {
            expect(() => controller.createSession(conclaveVoter, SessionType.CONCLAVE, 'sess-1'))
                .toThrow('Only administrators can create sessions.');
        });

        test('should throw error when creating a session with an existing id', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-1');
            expect(() => controller.createSession(admin, SessionType.CONCLAVE, 'sess-1'))
                .toThrow('Session with id sess-1 already exists.');
        });

        test('should delete session owned by the admin', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-1');
            controller.deleteSession(admin, 'sess-1');
            expect(() => controller.getState('sess-1')).toThrow('Session with id sess-1 not found.');
        });

        test('should throw error when non-admin tries to delete a session', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-1');
            expect(() => controller.deleteSession(conclaveVoter, 'sess-1'))
                .toThrow('Only administrators can delete sessions.');
        });

        test('should throw error when deleting another admin session', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-1');
            expect(() => controller.deleteSession(otherAdmin, 'sess-1'))
                .toThrow('Administrator is not allowed to delete sessions owned by another administrator.');
        });

        test('verifyAdminNotLinked should throw error if admin has linked sessions', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-1');
            expect(() => controller.verifyAdminNotLinked(admin))
                .toThrow("Admin can't be deleted: First delete all voting sessions that they still own.");
        });

        test('verifyAdminNotLinked should return true if admin has no linked sessions', () => {
            expect(controller.verifyAdminNotLinked(admin)).toBe(true);
        });
    });

    describe('Core Voting Logic & Domain Delegation (castVote)', () => {
        test('should throw error if admin tries to vote', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-1', ['Candidate A']);
            expect(() => controller.castVote(admin, 'Candidate A', 'sess-1'))
                .toThrow('Administrators cannot cast votes.');
        });

        test('should throw error if user sessionType does not match session type', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-1', ['Candidate A']);
            expect(() => controller.castVote(condoVoter, 'yes', 'sess-1'))
                .toThrow('User session type (CONDOMINIUM) does not match session type (CONCLAVE).');
        });

        test('should register and count Conclave votes successfully', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-conclave', ['Lucas', 'Victor']);
            controller.castVote(conclaveVoter, 'Lucas', 'sess-conclave');
            controller.countVotes('sess-conclave');

            expect(controller.getState('sess-conclave')).toBe(SessionState.RESULT);
            expect(controller.getResult('sess-conclave')).toBe('Lucas');
        });

        test('should register and count Condominium votes using User attribute weight', () => {
            controller.createSession(admin, SessionType.CONDOMINIUM, 'sess-condo', 'Facade Painting');
            controller.castVote(condoVoter, 'yes', 'sess-condo');
            controller.countVotes('sess-condo');

            expect(controller.getState('sess-condo')).toBe(SessionState.RESULT);
            expect(controller.getResult('sess-condo')).toBe(true);
        });

        test('should register and count ONU votes using User attribute for permanent member veto', () => {
            controller.createSession(admin, SessionType.ONU, 'sess-onu', 'Peace Agreement');
            controller.castVote(onuVoter, 'no', 'sess-onu');
            controller.countVotes('sess-onu');

            expect(controller.getState('sess-onu')).toBe(SessionState.RESULT);
            expect(controller.getResult('sess-onu')).toBe(false);
        });

        test('should throw duplicate vote error if same user votes twice in the same session', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 'sess-1', ['Lucas', 'Victor']);
            controller.castVote(conclaveVoter, 'Lucas', 'sess-1');

            expect(() => controller.castVote(conclaveVoter, 'Victor', 'sess-1'))
                .toThrow('Duplicate vote for voterId: v1');
        });
    });
});