import { beforeEach, describe, expect, it } from 'vitest';
import { SessionState } from './voting-session.js';
import { SessionType } from './session-type.js';
import { VotingController } from './voting-controller.js';
import { User } from './user.js';
import type { ICandidate } from './vote.js';

/*
 * Teste estrutural: VotingController (src/domain/voting-controller.ts).
 *
 * Ponto de partida: relatório de cobertura (Vitest + @vitest/coverage-v8, o mesmo do CI) no
 * commit 676d9e9, que mostrava voting-controller.ts com 94,33% das linhas e 85,71% dos
 * branches (30/35). As lacunas eram:
 *
 *   G1  linhas 98-99   deleteSession de sessão inexistente       -> coberta por DS2 (partition)
 *   G2  linhas 72/86   default do switch de createSession         -> coberta por CS6 (partition)
 *   G3  linha 78       lado falso do ternário de CONDOMINIUM      -> este arquivo
 *   G4  linha 82       lado falso do ternário de ONU              -> este arquivo
 *   G5  linhas 149-155 else final de castVote                     -> inalcançável (ver abaixo)
 *   G6  vote.ts:27     último fallback do nome do candidato       -> este arquivo (via castVote)
 *
 * G5 não é coberta de propósito: antes do else, castVote já exige que o tipo do votante seja
 * igual ao da sessão, e toda sessão existente foi criada com um dos três tipos válidos.
 *
 * Cada teste verifica o comportamento que a lacuna representa (a sessão criada funciona de
 * ponta a ponta, ou o voto é recusado e nada é registrado), e não só a execução da linha.
 */

const onuVoter = (id: string, permanent = false): User =>
    User.voter(id, { sessionType: SessionType.ONU, attribute: permanent });
const condoVoter = (id: string, fraction: number): User =>
    User.voter(id, { sessionType: SessionType.CONDOMINIUM, attribute: fraction });
const conclaveVoter = (id: string): User =>
    User.voter(id, { sessionType: SessionType.CONCLAVE, attribute: null });

describe('VotingController - structural coverage (gaps in the v8 report at 676d9e9)', () => {
    let controller: VotingController;
    let admin: User;

    beforeEach(() => {
        controller = new VotingController();
        admin = User.admin('admin-1');
    });

    // Current behavior: a session created without a text topic falls back to an empty topic
    // instead of failing. Requiring a topic at creation is planned in story #23.
    describe('G3: CONDOMINIUM session created without a text topic', () => {
        it('creates a working session when setupData is omitted: it accepts votes and reaches a result', () => {
            controller.createSession(admin, SessionType.CONDOMINIUM, 's1');

            expect(controller.getState('s1')).toBe(SessionState.VOTING);
            controller.castVote(condoVoter('v1', 0.6), 'yes', 's1');
            controller.countVotes('s1');
            expect(controller.getState('s1')).toBe(SessionState.RESULT);
            expect(controller.getResult('s1')).toBe(true);
        });

        it('ignores setupData of the wrong shape (a candidate list) and still creates a CONDOMINIUM session', () => {
            controller.createSession(admin, SessionType.CONDOMINIUM, 's1', ['A', 'B']);

            expect(controller.getState('s1')).toBe(SessionState.VOTING);
            // The list was not taken as Conclave candidates: the session is open to condominium
            // voters and closed to Conclave voters.
            expect(() => controller.castVote(conclaveVoter('c1'), 'A', 's1')).toThrow(
                'User session type (CONCLAVE) does not match session type (CONDOMINIUM).'
            );
            expect(() => controller.castVote(condoVoter('v1', 0.5), 'no', 's1')).not.toThrow();
        });
    });

    describe('G4: ONU session created without a text topic', () => {
        it('creates a working session when setupData is omitted: 9 votes in favor approve the resolution', () => {
            controller.createSession(admin, SessionType.ONU, 's1');

            expect(controller.getState('s1')).toBe(SessionState.VOTING);
            for (let i = 1; i <= 9; i++) {
                controller.castVote(onuVoter(`u${i}`), 'yes', 's1');
            }
            controller.countVotes('s1');
            expect(controller.getResult('s1')).toBe(true);
        });

        it('ignores setupData of the wrong shape (a candidate list) and still applies the ONU veto rule', () => {
            controller.createSession(admin, SessionType.ONU, 's1', ['A', 'B']);

            expect(controller.getState('s1')).toBe(SessionState.VOTING);
            for (let i = 1; i <= 9; i++) {
                controller.castVote(onuVoter(`u${i}`), 'yes', 's1');
            }
            controller.castVote(onuVoter('p1', true), 'no', 's1');
            controller.countVotes('s1');
            expect(controller.getResult('s1')).toBe(false);
        });
    });

    describe('G6: Conclave vote given as a candidate object without name and without id', () => {
        it('rejects the vote and registers nothing (value forced past the type checker)', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 's1', ['A', 'B']);

            expect(() => controller.castVote(conclaveVoter('v1'), {} as ICandidate, 's1')).toThrow(
                'candidateName is required'
            );
            expect(() => controller.countVotes('s1')).toThrow('Number of Votes must not be 0');
        });

        it('falls back to the candidate id when the object has no name, and the vote is counted for it', () => {
            controller.createSession(admin, SessionType.CONCLAVE, 's1', ['card-a', 'card-b']);

            controller.castVote(conclaveVoter('v1'), { candidateId: 'card-b' }, 's1');
            controller.countVotes('s1');
            expect(controller.getResult('s1')).toBe('card-b');
        });
    });
});
