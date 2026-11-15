import { describe, expect, it } from 'vitest';
import { ConclaveVotingSession, SessionState } from './voting-session.js';
import { ConclaveVote } from './vote.js';
import { SessionType } from './session-type.js';
import { VotingController } from './voting-controller.js';
import { User } from './user.js';

/*
 * Testes derivados do teste de mutação (StrykerJS) sobre src/domain/voting-session.ts.
 *
 * Mutante sobrevivente analisado, em ConclaveVotingSession.registerVote:
 *
 *     if (this.candidates.length > 0 && !this.candidates.includes(vote.candidateName))
 *                                 ^ mutado para ">= 0" (a condição da esquerda vira sempre verdadeira)
 *
 * Com a mutação, um Conclave aberto (criado sem lista de candidatos) passa a recusar todo voto.
 * Nenhum teste percebia: todos os testes que votavam em um Conclave criavam a sessão com uma
 * lista de candidatos, então o lado "lista vazia" da condição nunca decidia o resultado.
 *
 * A regra de negócio por trás da condição: nas primeiras rodadas do Conclave qualquer nome pode
 * ser votado; a restrição só existe depois que a lista é reduzida aos dois mais votados.
 *
 * O segundo bloco cobre outro sobrevivente da mesma execução, no comparador que ordena os
 * candidatos por número de votos ("b[1] - a[1]" mutado para "b[1] + a[1]"): o eleito tem de ser
 * o mais votado, qualquer que seja a ordem de chegada dos votos.
 */

const cardinal = (id: string): User => User.voter(id, { sessionType: SessionType.CONCLAVE, attribute: null });

// Registers one vote per name, in the given order, and counts the round.
const voteRound = (session: ConclaveVotingSession, round: string, names: string[]): void => {
    names.forEach((name, i) => session.registerVote(new ConclaveVote(cardinal(`${round}-v${i}`), name)));
    session.countVotes();
};

describe('Open Conclave (session created without a candidate list)', () => {
    it('accepts a vote for any name in the first round and elects whoever reaches 2/3', () => {
        const session = new ConclaveVotingSession();

        expect(() => voteRound(session, 'r1', ['Cardinal A', 'Cardinal A', 'Cardinal B'])).not.toThrow();

        expect(session.getState()).toBe(SessionState.RESULT);
        expect(session.getResult()).toBe('Cardinal A');
    });

    it('accepts any name through the controller when the administrator gives no candidates', () => {
        const controller = new VotingController();
        controller.createSession(User.admin('admin-1'), SessionType.CONCLAVE, 's1');

        controller.castVote(cardinal('v1'), 'Someone not announced beforehand', 's1');
        controller.countVotes('s1');

        expect(controller.getResult('s1')).toBe('Someone not announced beforehand');
    });

    it('keeps the ballot open while the rounds fail, then restricts it to the two most voted', () => {
        const session = new ConclaveVotingSession();
        const splitVote = ['Cardinal A', 'Cardinal A', 'Cardinal B', 'Cardinal B', 'Cardinal C'];

        // Rounds 1 and 2: nobody reaches 2/3; the ballot stays open, so a new name is still valid.
        voteRound(session, 'r1', splitVote);
        expect(session.getCandidates()).toEqual([]);
        voteRound(session, 'r2', [...splitVote.slice(0, 4), 'Cardinal D']);
        expect(session.getCandidates()).toEqual([]);

        // Round 3 also fails: from now on only the two most voted of that round can receive votes.
        voteRound(session, 'r3', splitVote);
        expect(session.getState()).toBe(SessionState.VOTING);
        expect(session.getCandidates()).toEqual(['Cardinal A', 'Cardinal B']);
        expect(() => session.registerVote(new ConclaveVote(cardinal('r4-v0'), 'Cardinal C'))).toThrow(
            'Voted candidate is not one of the two most voted of the last call'
        );
        expect(() => session.registerVote(new ConclaveVote(cardinal('r4-v1'), 'Cardinal B'))).not.toThrow();
    });
});

describe('Conclave: the most voted candidate wins regardless of the order in which votes arrive', () => {
    // B has 4 of 6 votes (exactly 2/3); A and C have one each.
    const orders: [string, string[]][] = [
        ['winner voted first', ['B', 'B', 'B', 'B', 'A', 'C']],
        ['winner voted last', ['A', 'C', 'B', 'B', 'B', 'B']],
        ['winner voted in between', ['A', 'B', 'B', 'B', 'B', 'C']],
        ['votes interleaved', ['B', 'A', 'B', 'C', 'B', 'B']]
    ];

    it.each(orders)('elects B when it has 2/3 of the votes (%s)', (_label, names) => {
        const session = new ConclaveVotingSession(['A', 'B', 'C']);

        voteRound(session, 'r1', names);

        expect(session.getState()).toBe(SessionState.RESULT);
        expect(session.getResult()).toBe('B');
    });

    it.each(orders)('narrows the ballot to the two most voted, by vote count (%s)', (_label, names) => {
        // Same arrival orders, but no 2/3: B 3 votes, A 2, C 1 -> after 3 failed rounds only B and A remain.
        const session = new ConclaveVotingSession(['A', 'B', 'C']);
        const round = names.map((name, i) => (name === 'B' && i === names.lastIndexOf('B') ? 'A' : name));

        voteRound(session, 'r1', round);
        voteRound(session, 'r2', round);
        voteRound(session, 'r3', round);

        expect(session.getCandidates()).toEqual(['B', 'A']);
    });
});
