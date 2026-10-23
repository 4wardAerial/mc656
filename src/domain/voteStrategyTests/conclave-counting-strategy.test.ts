import { expect, test, describe } from "vitest";
import { ConclaveVotingSession, SessionState } from "../voting-session.js";
import { ConclaveVote } from "../vote.js";

describe("ConclaveVotingSession", () => {

    const candidateA = "Candidate A";
    const candidateB = "Candidate B";
    const candidateC = "Candidate C";
    const candidateD = "Candidate D";
    const allCandidates = [candidateA, candidateB, candidateC, candidateD];

    const castVotes = (session: ConclaveVotingSession, votes: ConclaveVote[]): void => {
        for (const vote of votes) {
            session.registerVote(vote);
        }
        session.countVotes();
    };

    test("should throw an error when there are no votes", () => {
        const session = new ConclaveVotingSession(allCandidates);

        expect(() => session.countVotes()).toThrow(
            "Number of Votes must not be 0"
        );
        expect(session.getState()).toBe(SessionState.VOTING);
    });

    describe("Election before candidate restriction", () => {

        test("should elect a candidate with exactly 2/3 of the votes in the first voting", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should elect a candidate with more than 2/3 of the votes in the first voting", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should not elect a candidate with less than 2/3 of the votes in the first voting, incrementing currentCall and resetting to VOTING with all candidates", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateB),
            ]);

            // 3/5 < 2/3 -> increments currentCall and calls setCandidates(allCandidates)
            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);
            expect(session.getCandidates()).toEqual(allCandidates);
        });

        test("should elect a candidate with exactly 2/3 of the votes in the second voting", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateB),
                new ConclaveVote("v2", candidateC),
                new ConclaveVote("v3", candidateD),
            ]);

            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);

            castVotes(session, [
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateA),
                new ConclaveVote("v6", candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should not elect a candidate with less than 2/3 of the votes in the second voting, keeping all candidates", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateB),
                new ConclaveVote("v3", candidateC),
            ]);

            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);

            castVotes(session, [
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateA),
                new ConclaveVote("v6", candidateB),
                new ConclaveVote("v7", candidateB),
                new ConclaveVote("v8", candidateC),
            ]);

            // 2/5 < 2/3 -> 2nd try fails, still keeps all candidates for the 3rd try
            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(2);
            expect(session.getCandidates()).toEqual(allCandidates);
        });

    });

    describe("Election with a single candidate", () => {

        test("should elect the only candidate receiving votes", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should elect the only candidate even if the number of votes is one", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateA),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should elect the only allowed candidate after the 3 tries tolerance period", () => {
            const session = new ConclaveVotingSession(allCandidates);

            // Try 1
            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateB),
                new ConclaveVote("v3", candidateC),
            ]);
            expect(session.getCurrentCall()).toBe(1);

            // Try 2
            castVotes(session, [
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateB),
                new ConclaveVote("v6", candidateC),
            ]);
            expect(session.getCurrentCall()).toBe(2);

            // Try 3: A and B are the two most voted candidates
            castVotes(session, [
                new ConclaveVote("v7", candidateA),
                new ConclaveVote("v8", candidateA),
                new ConclaveVote("v9", candidateB),
                new ConclaveVote("v10", candidateB),
                new ConclaveVote("v11", candidateC),
            ]);
            expect(session.getCurrentCall()).toBe(3);
            expect(session.getCandidates()).toEqual([candidateA, candidateB]);

            // Try 4: A is allowed and wins
            castVotes(session, [
                new ConclaveVote("v12", candidateA),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

    });

    describe("Candidate restriction and tie-breaking after 3 tries", () => {

        test("should restrict candidates to the two most voted after 3 unsuccessful tries", () => {
            const session = new ConclaveVotingSession(allCandidates);

            // Try 1
            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateB),
                new ConclaveVote("v3", candidateC),
            ]);
            expect(session.getCandidates()).toEqual(allCandidates);

            // Try 2
            castVotes(session, [
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateB),
                new ConclaveVote("v6", candidateC),
            ]);
            expect(session.getCandidates()).toEqual(allCandidates);

            // Try 3: C (2 votes) and D (2 votes) are the two most voted
            castVotes(session, [
                new ConclaveVote("v7", candidateC),
                new ConclaveVote("v8", candidateC),
                new ConclaveVote("v9", candidateD),
                new ConclaveVote("v10", candidateD),
                new ConclaveVote("v11", candidateA),
            ]);

            expect(session.getCurrentCall()).toBe(3);
            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCandidates()).toEqual([candidateC, candidateD]);
        });

        test("should throw an error when a vote is cast for a candidate outside the two most voted after 3 tries", () => {
            const session = new ConclaveVotingSession(allCandidates);

            // 3 unsuccessful tries where A and B are top 2 on the 3rd try
            for (let i = 0; i < 3; i++) {
                castVotes(session, [
                    new ConclaveVote("v1", candidateA),
                    new ConclaveVote("v2", candidateA),
                    new ConclaveVote("v3", candidateB),
                    new ConclaveVote("v4", candidateB),
                    new ConclaveVote("v5", candidateC),
                ]);
            }

            expect(session.getCandidates()).toEqual([candidateA, candidateB]);

            // Try 4: voting for C (not in top 2) must throw
            session.registerVote(new ConclaveVote("v9", candidateA));
            session.registerVote(new ConclaveVote("v10", candidateC));

            expect(() => session.countVotes()).toThrow(
                "Voted candidate is not one of the two most voted of the last call"
            );
            // Invalid voting does not alter the two most voted or currentCall
            expect(session.getCurrentCall()).toBe(3);
            expect(session.getCandidates()).toEqual([candidateA, candidateB]);
            expect(session.getState()).toBe(SessionState.VOTING);
        });

        test("should elect candidate with > 50% of votes after 3 tries (even if < 2/3)", () => {
            const session = new ConclaveVotingSession(allCandidates);

            for (let i = 0; i < 3; i++) {
                castVotes(session, [
                    new ConclaveVote("v1", candidateA),
                    new ConclaveVote("v2", candidateA),
                    new ConclaveVote("v3", candidateB),
                    new ConclaveVote("v4", candidateB),
                    new ConclaveVote("v5", candidateC),
                ]);
            }

            expect(session.getCandidates()).toEqual([candidateA, candidateB]);

            // Try 4: B gets 3/5 (60% > 50%, though < 2/3) -> B must be elected
            castVotes(session, [
                new ConclaveVote("v1", candidateB),
                new ConclaveVote("v2", candidateB),
                new ConclaveVote("v3", candidateB),
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateA),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateB);
        });

        test("should use alphabetical order as determinator in case of a tie after 3 tries", () => {
            const session = new ConclaveVotingSession(allCandidates);

            // Try 1 & 2
            for (let i = 0; i < 2; i++) {
                castVotes(session, [
                    new ConclaveVote("v1", candidateA),
                    new ConclaveVote("v2", candidateB),
                    new ConclaveVote("v3", candidateC),
                ]);
            }

            // Try 3: C and B are the two most voted
            castVotes(session, [
                new ConclaveVote("v1", candidateC),
                new ConclaveVote("v2", candidateC),
                new ConclaveVote("v3", candidateB),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateA),
            ]);

            expect(session.getCandidates()).toEqual([candidateB, candidateC]);

            // Try 4: 50%-50% tie between C and B -> Candidate B wins by alphabetical order
            castVotes(session, [
                new ConclaveVote("v1", candidateC),
                new ConclaveVote("v2", candidateC),
                new ConclaveVote("v3", candidateB),
                new ConclaveVote("v4", candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateB);
        });

    });

    describe("Two-thirds boundary cases", () => {

        test("should elect with exactly 4/6 votes", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateB),
                new ConclaveVote("v6", candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should not elect with a result just below two-thirds", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateB),
            ]);

            // 3/5 < 2/3
            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);
        });

        test("should elect with a result above two-thirds", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateB),
            ]);

            // 4/5 > 2/3
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

    });

});
