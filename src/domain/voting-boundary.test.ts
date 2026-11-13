import { describe, expect, it } from 'vitest';
import { ConclaveVotingSession, CondominiumVotingSession, ONUVotingSession, SessionState } from './voting-session.js';
import { CondominiumVote, ConclaveVote, ONUVote } from './vote.js';
import { SessionType } from './session-type.js';
import { User, assertAttributeMatches, parseAttribute } from './user.js';

/*
 * Análise de valor limite. Os limites vêm das regras reais de cada votação:
 *  - ONU: aprovação exige no mínimo 9 votos favoráveis (limite 9).
 *  - Conclave: eleição exige ao menos 2/3 dos votos válidos da rodada (limite 2/3).
 *  - Condomínio: o peso (fração ideal) é estritamente maior que zero (limite 0) e a 1ª chamada
 *    exige mais que metade do total (limite 0,5).
 * Para cada limite são testados o valor imediatamente abaixo, o próprio limite e o imediatamente acima.
 */

const onuUser = (id: string): User => User.voter(id, { sessionType: SessionType.ONU, attribute: false });
const conclaveUser = (id: string): User => User.voter(id, { sessionType: SessionType.CONCLAVE, attribute: null });
const condoUser = (id: string, fraction: number): User =>
    User.voter(id, { sessionType: SessionType.CONDOMINIUM, attribute: fraction });

describe('Boundary value analysis - ONU: 9 votes in favor', () => {
    // 15 voters (the size of the Security Council), no permanent member voting "no"; the rest abstain.
    // With 15 voters, 9 "yes" is also a majority, so only the minimum of 9 is being measured.
    const run = (yes: number): ONUVotingSession => {
        const session = new ONUVotingSession('Resolution 1');
        for (let i = 0; i < 15; i++) {
            session.registerVote(new ONUVote(onuUser(`v${i}`), i < yes ? 'yes' : 'abstention'));
        }
        session.countVotes();
        return session;
    };

    it('rejects with 8 votes in favor (boundary - 1)', () => {
        const session = run(8);
        expect(session.getState()).toBe(SessionState.RESULT);
        expect(session.getResult()).toBe(false);
    });

    it('approves with exactly 9 votes in favor (boundary)', () => {
        const session = run(9);
        expect(session.getState()).toBe(SessionState.RESULT);
        expect(session.getResult()).toBe(true);
    });

    it('approves with 10 votes in favor (boundary + 1)', () => {
        const session = run(10);
        expect(session.getState()).toBe(SessionState.RESULT);
        expect(session.getResult()).toBe(true);
    });
});

describe('Boundary value analysis - Conclave: 2/3 of the votes in the 1st round', () => {
    // Candidate A receives `topVotes` votes; the remaining votes go to B
    const firstRound = (total: number, topVotes: number): ConclaveVotingSession => {
        const session = new ConclaveVotingSession(['A', 'B', 'C']);
        for (let i = 0; i < total; i++) {
            session.registerVote(new ConclaveVote(conclaveUser(`v${i}`), i < topVotes ? 'A' : 'B'));
        }
        session.countVotes();
        return session;
    };

    // [voters, votes below 2/3, votes at exactly 2/3, votes above 2/3]
    const cases: [number, number, number, number][] = [
        [9, 5, 6, 7],
        [12, 7, 8, 9]
    ];

    describe.each(cases)('with %i voters', (total, below, exact, above) => {
        it(`does not elect with ${below} votes (${below}/${total} < 2/3) and opens a new round`, () => {
            const session = firstRound(total, below);

            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);
            expect(() => session.getResult()).toThrow('Result is only available after Counting is complete.');
        });

        it(`elects with exactly ${exact} votes (${exact}/${total} = 2/3)`, () => {
            const session = firstRound(total, exact);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe('A');
        });

        it(`elects with ${above} votes (${above}/${total} > 2/3)`, () => {
            const session = firstRound(total, above);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe('A');
        });
    });
});

describe('Boundary value analysis - Condominium: weight (ideal fraction) greater than zero', () => {
    it('rejects a vote with weight 0 (boundary)', () => {
        expect(() => new CondominiumVote(condoUser('v1', 0.5), 0, 'yes')).toThrow('weight must be greater than zero');
    });

    it('accepts a vote with the smallest representable positive weight, Number.MIN_VALUE (boundary + 1 step)', () => {
        const vote = new CondominiumVote(condoUser('v1', 0.5), Number.MIN_VALUE, 'yes');
        expect(vote.weight).toBe(Number.MIN_VALUE);
    });

    it('rejects a vote with weight -Number.MIN_VALUE (boundary - 1 step)', () => {
        expect(() => new CondominiumVote(condoUser('v1', 0.5), -Number.MIN_VALUE, 'yes')).toThrow(
            'weight must be greater than zero'
        );
    });

    it('applies the same boundary to the voter attribute: 0 and -Number.MIN_VALUE rejected, Number.MIN_VALUE accepted', () => {
        expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, 0)).toThrow('greater than zero');
        expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, -Number.MIN_VALUE)).toThrow('greater than zero');
        expect(() => assertAttributeMatches(SessionType.CONDOMINIUM, Number.MIN_VALUE)).not.toThrow();
    });

    it('applies the same boundary to the CSV text: "0" rejected, "5e-324" (Number.MIN_VALUE) accepted', () => {
        expect(() => parseAttribute(SessionType.CONDOMINIUM, '0')).toThrow('greater than zero');
        expect(parseAttribute(SessionType.CONDOMINIUM, '5e-324')).toBe(Number.MIN_VALUE);
    });
});

describe('Boundary value analysis - Condominium: more than half of the total in the 1st call', () => {
    // Immediate neighbors of 0.5 in floating point: the spacing is 2^-54 below and 2^-53 above.
    const justBelow = 0.5 - Number.EPSILON / 4;
    const justAbove = 0.5 + Number.EPSILON / 2;

    const firstCall = (yesWeight: number): CondominiumVotingSession => {
        const session = new CondominiumVotingSession('Works');
        session.registerVote(new CondominiumVote(condoUser('v1', yesWeight), yesWeight, 'yes'));
        session.countVotes();
        return session;
    };

    it('the test values are indeed the immediate neighbors of 0.5', () => {
        expect(justBelow).toBeLessThan(0.5);
        expect(justAbove).toBeGreaterThan(0.5);
        expect(justBelow + Number.EPSILON / 4).toBe(0.5);
        expect(0.5 + Number.EPSILON / 4).toBe(0.5);
    });

    it('does not approve with a "yes" weight immediately below 0.5 (boundary - 1 step)', () => {
        expect(firstCall(justBelow).getState()).toBe(SessionState.VOTING);
    });

    it('does not approve with a "yes" weight of exactly 0.5 (boundary): goes to the 2nd call', () => {
        expect(firstCall(0.5).getState()).toBe(SessionState.VOTING);
    });

    it('approves with a "yes" weight immediately above 0.5 (boundary + 1 step)', () => {
        const session = firstCall(justAbove);

        expect(session.getState()).toBe(SessionState.RESULT);
        expect(session.getResult()).toBe(true);
    });
});