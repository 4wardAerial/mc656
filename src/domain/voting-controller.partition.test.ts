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

describe('VotingController – particionamento em classes de equivalência', () => {
    let controller: VotingController;
    let admin: User;
    let otherAdmin: User;

    beforeEach(() => {
        controller = new VotingController();
        admin = User.admin('admin-1');
        otherAdmin = User.admin('admin-2');
    });

    describe('castVote', () => {
        describe('CE1 (inválida): usuário administrador', () => {
            it('recusa o voto e não registra nada na sessão', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);

                expect(() => controller.castVote(admin, 'A', 's1')).toThrow('Administrators cannot cast votes.');
                expect(() => controller.countVotes('s1')).toThrow('Number of Votes must not be 0');
            });
        });

        describe('CE2 (inválida): votante de tipo diferente do tipo da sessão', () => {
            it.each<[string, User, SessionType, string]>([
                ['ONU em sessão CONCLAVE', onuVoter('v1'), SessionType.CONCLAVE, 'User session type (ONU) does not match session type (CONCLAVE).'],
                ['CONDOMINIUM em sessão ONU', condoVoter('v1', 0.5), SessionType.ONU, 'User session type (CONDOMINIUM) does not match session type (ONU).'],
                ['CONCLAVE em sessão CONDOMINIUM', conclaveVoter('v1'), SessionType.CONDOMINIUM, 'User session type (CONCLAVE) does not match session type (CONDOMINIUM).']
            ])('recusa %s', (_label, voter, sessionType, message) => {
                controller.createSession(admin, sessionType, 's1', sessionType === SessionType.CONCLAVE ? ['A'] : 'Pauta');

                expect(() => controller.castVote(voter, 'yes', 's1')).toThrow(message);
                expect(() => controller.countVotes('s1')).toThrow('Number of Votes must not be 0');
            });
        });

        describe('CE3 (inválida): sessão inexistente', () => {
            it('recusa o voto informando o id da sessão', () => {
                expect(() => controller.castVote(conclaveVoter('v1'), 'A', 'ghost')).toThrow(
                    'Session with id ghost not found.'
                );
            });
        });

        describe('CE4 (inválida): segundo voto do mesmo votante', () => {
            it('recusa o segundo voto e mantém o primeiro', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);
                const voter = conclaveVoter('v1');
                controller.castVote(voter, 'A', 's1');

                expect(() => controller.castVote(voter, 'B', 's1')).toThrow('Duplicate vote for voterId: v1');

                controller.countVotes('s1');
                expect(controller.getResult('s1')).toBe('A');
            });
        });

        describe('CE5 (válida): voto em sessão CONCLAVE', () => {
            it('registra o voto dado como texto', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);
                controller.castVote(conclaveVoter('v1'), 'A', 's1');

                controller.countVotes('s1');
                expect(controller.getResult('s1')).toBe('A');
            });

            it('registra o voto dado como objeto de candidato, resolvendo o nome', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);
                controller.castVote(conclaveVoter('v1'), { candidateId: 'c-b', name: 'B' }, 's1');

                controller.countVotes('s1');
                expect(controller.getResult('s1')).toBe('B');
            });
        });

        describe('CE6 (válida): voto em sessão ONU', () => {
            it('registra o voto "yes" de 9 membros não permanentes e a resolução é aprovada', () => {
                controller.createSession(admin, SessionType.ONU, 's1', 'Resolução 1');
                for (let i = 1; i <= 9; i++) {
                    controller.castVote(onuVoter(`u${i}`), 'yes', 's1');
                }

                controller.countVotes('s1');
                expect(controller.getResult('s1')).toBe(true);
            });

            it('propaga o atributo "permanente" do votante: o "no" dele é veto; o de um não permanente não é', () => {
                const run = (permanent: boolean): boolean | string => {
                    const sessionId = `s-${String(permanent)}`;
                    controller.createSession(admin, SessionType.ONU, sessionId, 'Resolução 1');
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

        describe('CE7 (válida): voto em sessão CONDOMINIUM', () => {
            it('usa a fração do votante como peso: 0,6 "yes" na 1ª chamada aprova', () => {
                controller.createSession(admin, SessionType.CONDOMINIUM, 's1', 'Pintura');
                controller.castVote(condoVoter('v1', 0.6), 'yes', 's1');

                controller.countVotes('s1');
                expect(controller.getState('s1')).toBe(SessionState.RESULT);
                expect(controller.getResult('s1')).toBe(true);
            });

            it('usa a fração do votante como peso: 0,4 "yes" na 1ª chamada não aprova', () => {
                controller.createSession(admin, SessionType.CONDOMINIUM, 's1', 'Pintura');
                controller.castVote(condoVoter('v1', 0.4), 'yes', 's1');

                controller.countVotes('s1');
                expect(controller.getState('s1')).not.toBe(SessionState.RESULT);
            });
        });

        describe('CE8 (inválida): candidato do Conclave fora da lista da sessão', () => {
            it('recusa o voto e não o registra', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);

                expect(() => controller.castVote(conclaveVoter('v1'), 'Z', 's1')).toThrow('not one of the two most voted');
                expect(() => controller.countVotes('s1')).toThrow('Number of Votes must not be 0');
            });
        });

        describe('CE9 (inválida): voto do Conclave sem nome de candidato', () => {
            it('recusa o voto vazio', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);

                expect(() => controller.castVote(conclaveVoter('v1'), '', 's1')).toThrow('candidateName is required');
            });
        });
    });

    describe('createSession', () => {
        describe('CS1 (inválida): usuário não administrador', () => {
            it('recusa e não cria a sessão', () => {
                expect(() => controller.createSession(conclaveVoter('v1'), SessionType.CONCLAVE, 's1')).toThrow(
                    'Only administrators can create sessions.'
                );
                expect(() => controller.getState('s1')).toThrow('Session with id s1 not found.');
            });
        });

        describe('CS2 (inválida): id de sessão já utilizado', () => {
            it.each([SessionType.CONCLAVE, SessionType.ONU])('recusa o id repetido ao criar uma sessão %s', (type) => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);

                expect(() => controller.createSession(otherAdmin, type, 's1', 'Pauta')).toThrow(
                    'Session with id s1 already exists.'
                );
            });
        });

        describe('CS3 (válida): sessão CONCLAVE com candidatos', () => {
            it('cria a sessão em votação, aceitando só os candidatos informados', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);

                expect(controller.getState('s1')).toBe(SessionState.VOTING);
                controller.castVote(conclaveVoter('v1'), 'A', 's1');
                expect(() => controller.castVote(conclaveVoter('v2'), 'Z', 's1')).toThrow('not one of the two most voted');
            });
        });

        describe('CS4 (válida): sessão CONDOMINIUM com pauta', () => {
            it('cria a sessão em votação, aberta a votantes de condomínio', () => {
                controller.createSession(admin, SessionType.CONDOMINIUM, 's1', 'Pintura da fachada');

                expect(controller.getState('s1')).toBe(SessionState.VOTING);
                expect(() => controller.castVote(condoVoter('v1', 0.5), 'yes', 's1')).not.toThrow();
            });
        });

        describe('CS5 (válida): sessão ONU com pauta', () => {
            it('cria a sessão em votação, aberta a votantes da ONU', () => {
                controller.createSession(admin, SessionType.ONU, 's1', 'Resolução 42');

                expect(controller.getState('s1')).toBe(SessionState.VOTING);
                expect(() => controller.castVote(onuVoter('v1'), 'yes', 's1')).not.toThrow();
            });
        });

        describe('CS6 (inválida): tipo de sessão fora do enum', () => {
            it('recusa o tipo e não cria a sessão (valor forçado além do type checker)', () => {
                expect(() => controller.createSession(admin, 'PARLIAMENT' as SessionType, 's1', 'Pauta')).toThrow(
                    'Unsupported session type: PARLIAMENT'
                );
                expect(() => controller.getState('s1')).toThrow('Session with id s1 not found.');
            });
        });

        it('registra o administrador criador como dono da sessão (não pode ser removido enquanto a possuir)', () => {
            controller.createSession(admin, SessionType.ONU, 's1', 'Pauta');

            expect(() => controller.verifyAdminNotLinked(admin)).toThrow("Admin can't be deleted");
            expect(controller.verifyAdminNotLinked(otherAdmin)).toBe(true);
        });
    });

    describe('deleteSession', () => {
        describe('DS1 (inválida): usuário não administrador', () => {
            it('recusa e mantém a sessão', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);

                expect(() => controller.deleteSession(conclaveVoter('v1'), 's1')).toThrow(
                    'Only administrators can delete sessions.'
                );
                expect(controller.getState('s1')).toBe(SessionState.VOTING);
            });
        });

        describe('DS2 (inválida): sessão inexistente', () => {
            it('recusa informando o id da sessão', () => {
                expect(() => controller.deleteSession(admin, 'ghost')).toThrow('Session with id ghost not found.');
            });
        });

        describe('DS3 (inválida): administrador que não é o dono da sessão', () => {
            it('recusa e mantém a sessão', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);

                expect(() => controller.deleteSession(otherAdmin, 's1')).toThrow(
                    'Administrator is not allowed to delete sessions owned by another administrator.'
                );
                expect(controller.getState('s1')).toBe(SessionState.VOTING);
            });
        });

        describe('DS4 (válida): administrador dono da sessão', () => {
            it('remove apenas a sessão indicada, libera o id e libera o administrador', () => {
                controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A']);
                controller.createSession(admin, SessionType.ONU, 's2', 'Pauta');

                controller.deleteSession(admin, 's1');

                expect(() => controller.getState('s1')).toThrow('Session with id s1 not found.');
                expect(controller.getState('s2')).toBe(SessionState.VOTING);
                expect(() => controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A'])).not.toThrow();
            });
        });
    });
});