import { beforeEach, describe, expect, it } from 'vitest';
import { SessionState } from './voting-session.js';
import { SessionType } from './session-type.js';
import { VotingController } from './voting-controller.js';
import { User } from './user.js';

/*
 * Escopo: VotingController (src/domain/voting-controller.ts), que concentra as regras de
 * quem pode criar, apagar e votar em cada sessão.
 *
 * Funções particionadas: castVote (CE1 a CE9), createSession (CS1 a CS6) e deleteSession
 * (DS1 a DS4). O controller não expõe os votos; o efeito de cada voto é conferido pelo
 * resultado da apuração e pela recusa de voto duplicado se for o caso.
 */

const conclaveVoter = (id: string): User =>
    User.voter(id, { sessionType: SessionType.CONCLAVE, attribute: null });
const onuVoter = (id: string, permanent = false): User =>
    User.voter(id, { sessionType: SessionType.ONU, attribute: permanent });
const condoVoter = (id: string, fraction: number): User =>
    User.voter(id, { sessionType: SessionType.CONDOMINIUM, attribute: fraction });
 
describe('VotingController - equivalence class partitioning', () => {
    let controller: VotingController;
    let admin: User;
    let otherAdmin: User;
 
    beforeEach(() => {
        controller = new VotingController();
        admin = User.admin('admin-1');
        otherAdmin = User.admin('admin-2');
    });
 
    describe('castVote', () => {
        describe('CE1 (invalid): administrator user', () => {
            it('rejects the vote and registers nothing in the session', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);
 
                expect(() => controller.castVote(admin, 'A', 's1')).toThrow('Administrators cannot cast votes.');
                expect(() => controller.countVotes('s1')).toThrow('Number of Votes must not be 0');
            });
        });
 
        describe('CE2 (invalid): voter whose type differs from the session type', () => {
            it.each<[string, User, SessionType, string]>([
                ['ONU voter in a CONCLAVE session', onuVoter('v1'), SessionType.CONCLAVE, 'User session type (ONU) does not match session type (CONCLAVE).'],
                ['CONDOMINIUM voter in an ONU session', condoVoter('v1', 0.5), SessionType.ONU, 'User session type (CONDOMINIUM) does not match session type (ONU).'],
                ['CONCLAVE voter in a CONDOMINIUM session', conclaveVoter('v1'), SessionType.CONDOMINIUM, 'User session type (CONCLAVE) does not match session type (CONDOMINIUM).']
            ])('rejects %s', (_label, voter, sessionType, message) => {
                controller.createSession(admin, sessionType, 's1', sessionType === SessionType.CONCLAVE ? ['A'] : 'Topic');
 
                expect(() => controller.castVote(voter, 'yes', 's1')).toThrow(message);
                expect(() => controller.countVotes('s1')).toThrow('Number of Votes must not be 0');
            });
        });
 
        describe('CE3 (invalid): nonexistent session', () => {
            it('rejects the vote and reports the session id', () => {
                expect(() => controller.castVote(conclaveVoter('v1'), 'A', 'ghost')).toThrow(
                    'Session with id ghost not found.'
                );
            });
        });
 
        describe('CE4 (invalid): second vote from the same voter', () => {
            it('rejects the second vote and keeps the first one', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);
                const voter = conclaveVoter('v1');
                controller.castVote(voter, 'A', 's1');
 
                expect(() => controller.castVote(voter, 'B', 's1')).toThrow('Duplicate vote for voterId: v1');
 
                controller.countVotes('s1');
                expect(controller.getResult('s1')).toBe('A');
            });
        });
 
        describe('CE5 (valid): vote in a CONCLAVE session', () => {
            it('registers a vote given as text', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);
                controller.castVote(conclaveVoter('v1'), 'A', 's1');
 
                controller.countVotes('s1');
                expect(controller.getResult('s1')).toBe('A');
            });
 
            it('registers a vote given as a candidate object, resolving its name', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);
                controller.castVote(conclaveVoter('v1'), { candidateId: 'c-b', name: 'B' }, 's1');
 
                controller.countVotes('s1');
                expect(controller.getResult('s1')).toBe('B');
            });
        });
 
        describe('CE6 (valid): vote in an ONU session', () => {
            it('registers the "yes" votes of 9 non-permanent members and the resolution is approved', () => {
                controller.createSession(admin, SessionType.ONU, 's1', 'Resolution 1');
                for (let i = 1; i <= 9; i++) {
                    controller.castVote(onuVoter(`u${i}`), 'yes', 's1');
                }
 
                controller.countVotes('s1');
                expect(controller.getResult('s1')).toBe(true);
            });
 
            it('propagates the voter "permanent" attribute: their "no" is a veto; a non-permanent "no" is not', () => {
                const run = (permanent: boolean): boolean | string => {
                    const sessionId = `s-${String(permanent)}`;
                    controller.createSession(admin, SessionType.ONU, sessionId, 'Resolution 1');
                    for (let i = 1; i <= 9; i++) {
                        controller.castVote(onuVoter(`${sessionId}-y${i}`), 'yes', sessionId);
                    }
                    controller.castVote(onuVoter(`${sessionId}-n`, permanent), 'no', sessionId);
                    controller.countVotes(sessionId);
                    return controller.getResult(sessionId);
                };
 
                expect(run(true)).toBe(false);
                expect(run(false)).toBe(true);
            });
        });
 
        describe('CE7 (valid): vote in a CONDOMINIUM session', () => {
            it('uses the voter fraction as weight: a 0.6 "yes" in the 1st call approves', () => {
                controller.createSession(admin, SessionType.CONDOMINIUM, 's1', 'Painting');
                controller.castVote(condoVoter('v1', 0.6), 'yes', 's1');
 
                controller.countVotes('s1');
                expect(controller.getState('s1')).toBe(SessionState.RESULT);
                expect(controller.getResult('s1')).toBe(true);
            });
 
            it('uses the voter fraction as weight: a 0.4 "yes" in the 1st call does not approve', () => {
                controller.createSession(admin, SessionType.CONDOMINIUM, 's1', 'Painting');
                controller.castVote(condoVoter('v1', 0.4), 'yes', 's1');
 
                controller.countVotes('s1');
                expect(controller.getState('s1')).not.toBe(SessionState.RESULT);
            });
        });
 
        describe('CE8 (invalid): Conclave candidate outside the session list', () => {
            it('rejects the vote and does not register it', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);
 
                expect(() => controller.castVote(conclaveVoter('v1'), 'Z', 's1')).toThrow('not one of the two most voted');
                expect(() => controller.countVotes('s1')).toThrow('Number of Votes must not be 0');
            });
        });
 
        describe('CE9 (invalid): Conclave vote without a candidate name', () => {
            it('rejects the empty vote', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);
 
                expect(() => controller.castVote(conclaveVoter('v1'), '', 's1')).toThrow('candidateName is required');
            });
        });
    });
 
    describe('createSession', () => {
        describe('CS1 (invalid): non-administrator user', () => {
            it('rejects and does not create the session', () => {
                expect(() => controller.createSession(conclaveVoter('v1'), SessionType.CONCLAVE, 's1')).toThrow(
                    'Only administrators can create sessions.'
                );
                expect(() => controller.getState('s1')).toThrow('Session with id s1 not found.');
            });
        });
 
        describe('CS2 (invalid): session id already in use', () => {
            it.each([SessionType.CONCLAVE, SessionType.ONU])('rejects the repeated id when creating a %s session', (type) => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);
 
                expect(() => controller.createSession(otherAdmin, type, 's1', 'Topic')).toThrow(
                    'Session with id s1 already exists.'
                );
            });
        });
 
        describe('CS3 (valid): CONCLAVE session with candidates', () => {
            it('creates the session in voting state, accepting only the given candidates', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);
 
                expect(controller.getState('s1')).toBe(SessionState.VOTING);
                controller.castVote(conclaveVoter('v1'), 'A', 's1');
                expect(() => controller.castVote(conclaveVoter('v2'), 'Z', 's1')).toThrow('not one of the two most voted');
            });
        });
 
        describe('CS4 (valid): CONDOMINIUM session with a topic', () => {
            it('creates the session in voting state, open to condominium voters', () => {
                controller.createSession(admin, SessionType.CONDOMINIUM, 's1', 'Facade painting');
 
                expect(controller.getState('s1')).toBe(SessionState.VOTING);
                expect(() => controller.castVote(condoVoter('v1', 0.5), 'yes', 's1')).not.toThrow();
            });
        });
 
        describe('CS5 (valid): ONU session with a topic', () => {
            it('creates the session in voting state, open to ONU voters', () => {
                controller.createSession(admin, SessionType.ONU, 's1', 'Resolution 42');
 
                expect(controller.getState('s1')).toBe(SessionState.VOTING);
                expect(() => controller.castVote(onuVoter('v1'), 'yes', 's1')).not.toThrow();
            });
        });
 
        describe('CS6 (invalid): session type outside the enum', () => {
            it('rejects the type and does not create the session (value forced past the type checker)', () => {
                expect(() => controller.createSession(admin, 'PARLIAMENT' as SessionType, 's1', 'Topic')).toThrow(
                    'Unsupported session type: PARLIAMENT'
                );
                expect(() => controller.getState('s1')).toThrow('Session with id s1 not found.');
            });
        });
 
        it('records the creating administrator as the session owner (cannot be removed while owning it)', () => {
            controller.createSession(admin, SessionType.ONU, 's1', 'Topic');
 
            expect(() => controller.verifyAdminNotLinked(admin)).toThrow("Admin can't be deleted");
            expect(controller.verifyAdminNotLinked(otherAdmin)).toBe(true);
        });
    });
 
    describe('deleteSession', () => {
        describe('DS1 (invalid): non-administrator user', () => {
            it('rejects and keeps the session', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);
 
                expect(() => controller.deleteSession(conclaveVoter('v1'), 's1')).toThrow(
                    'Only administrators can delete sessions.'
                );
                expect(controller.getState('s1')).toBe(SessionState.VOTING);
            });
        });
 
        describe('DS2 (invalid): nonexistent session', () => {
            it('rejects and reports the session id', () => {
                expect(() => controller.deleteSession(admin, 'ghost')).toThrow('Session with id ghost not found.');
            });
        });
 
        describe('DS3 (invalid): administrator who does not own the session', () => {
            it('rejects and keeps the session', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);
 
                expect(() => controller.deleteSession(otherAdmin, 's1')).toThrow(
                    'Administrator is not allowed to delete sessions owned by another administrator.'
                );
                expect(controller.getState('s1')).toBe(SessionState.VOTING);
            });
        });
 
        describe('DS4 (valid): administrator who owns the session', () => {
            it('removes only the given session, frees its id and releases the administrator', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);
                controller.createSession(admin, SessionType.ONU, 's2', 'Topic');
 
                controller.deleteSession(admin, 's1');
 
                expect(() => controller.getState('s1')).toThrow('Session with id s1 not found.');
                expect(controller.getState('s2')).toBe(SessionState.VOTING);
                expect(() => controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A'])).not.toThrow();
            });
        });
    });
});