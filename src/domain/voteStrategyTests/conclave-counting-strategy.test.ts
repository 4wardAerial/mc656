import { expect, test, describe } from "vitest";
import { ConclaveVotingSession, SessionState } from "../voting-session.js";
import { ConclaveVote } from "../vote.js";
import { User } from "../user.js";
import { SessionType } from "../session-type.js";

describe("ConclaveVotingSession", () => {

    const candidateA = "Candidate A";
    const candidateB = "Candidate B";
    const candidateC = "Candidate C";
    const candidateD = "Candidate D";
    const allCandidates = [candidateA, candidateB, candidateC, candidateD];

    const makeUser = (id: string): User => 
        User.voter(id, { sessionType: SessionType.CONCLAVE, attribute: null });

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
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateA),
                new ConclaveVote(makeUser("v3"), candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should elect a candidate with more than 2/3 of the votes in the first voting", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateA),
                new ConclaveVote(makeUser("v3"), candidateA),
                new ConclaveVote(makeUser("v4"), candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should not elect a candidate with less than 2/3 of the votes in the first voting, incrementing currentCall and resetting to VOTING with all candidates", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateA),
                new ConclaveVote(makeUser("v3"), candidateA),
                new ConclaveVote(makeUser("v4"), candidateB),
                new ConclaveVote(makeUser("v5"), candidateB),
            ]);

            // 3/5 < 2/3 -> increments currentCall and resets round with allCandidates
            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);
            expect(session.getCandidates()).toEqual(allCandidates);
        });

        test("should elect a candidate with exactly 2/3 of the votes in the second voting", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateB),
                new ConclaveVote(makeUser("v2"), candidateC),
                new ConclaveVote(makeUser("v3"), candidateD),
            ]);

            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);

            castVotes(session, [
                new ConclaveVote(makeUser("v4"), candidateA),
                new ConclaveVote(makeUser("v5"), candidateA),
                new ConclaveVote(makeUser("v6"), candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should not elect a candidate with less than 2/3 of the votes in the second voting, keeping all candidates", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateB),
                new ConclaveVote(makeUser("v3"), candidateC),
            ]);

            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);

            castVotes(session, [
                new ConclaveVote(makeUser("v4"), candidateA),
                new ConclaveVote(makeUser("v5"), candidateA),
                new ConclaveVote(makeUser("v6"), candidateB),
                new ConclaveVote(makeUser("v7"), candidateB),
                new ConclaveVote(makeUser("v8"), candidateC),
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
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateA),
                new ConclaveVote(makeUser("v3"), candidateA),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should elect the only candidate even if the number of votes is one", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should elect the only allowed candidate after the 3 tries tolerance period", () => {
            const session = new ConclaveVotingSession(allCandidates);

            // Try 1
            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateB),
                new ConclaveVote(makeUser("v3"), candidateC),
            ]);
            expect(session.getCurrentCall()).toBe(1);

            // Try 2
            castVotes(session, [
                new ConclaveVote(makeUser("v4"), candidateA),
                new ConclaveVote(makeUser("v5"), candidateB),
                new ConclaveVote(makeUser("v6"), candidateC),
            ]);
            expect(session.getCurrentCall()).toBe(2);

            // Try 3: A and B are the two most voted candidates
            castVotes(session, [
                new ConclaveVote(makeUser("v7"), candidateA),
                new ConclaveVote(makeUser("v8"), candidateA),
                new ConclaveVote(makeUser("v9"), candidateB),
                new ConclaveVote(makeUser("v10"), candidateB),
                new ConclaveVote(makeUser("v11"), candidateC),
            ]);
            expect(session.getCurrentCall()).toBe(3);
            expect(session.getCandidates()).toEqual([candidateA, candidateB]);

            // Try 4: A is allowed and wins
            castVotes(session, [
                new ConclaveVote(makeUser("v12"), candidateA),
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
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateB),
                new ConclaveVote(makeUser("v3"), candidateC),
            ]);
            expect(session.getCandidates()).toEqual(allCandidates);

            // Try 2
            castVotes(session, [
                new ConclaveVote(makeUser("v4"), candidateA),
                new ConclaveVote(makeUser("v5"), candidateB),
                new ConclaveVote(makeUser("v6"), candidateC),
            ]);
            expect(session.getCandidates()).toEqual(allCandidates);

            // Try 3: C (2 votes) and D (2 votes) are the two most voted
            castVotes(session, [
                new ConclaveVote(makeUser("v7"), candidateC),
                new ConclaveVote(makeUser("v8"), candidateC),
                new ConclaveVote(makeUser("v9"), candidateD),
                new ConclaveVote(makeUser("v10"), candidateD),
                new ConclaveVote(makeUser("v11"), candidateA),
            ]);

            expect(session.getCurrentCall()).toBe(3);
            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCandidates()).toEqual([candidateC, candidateD]);
        });

        test("should reject an invalid candidate vote in registerVote without erasing previously registered valid votes", () => {
            const session = new ConclaveVotingSession(allCandidates);

            // 3 unsuccessful tries where A and B are top 2 on the 3rd try
            for (let i = 0; i < 3; i++) {
                castVotes(session, [
                    new ConclaveVote(makeUser("v1"), candidateA),
                    new ConclaveVote(makeUser("v2"), candidateA),
                    new ConclaveVote(makeUser("v3"), candidateB),
                    new ConclaveVote(makeUser("v4"), candidateB),
                    new ConclaveVote(makeUser("v5"), candidateC),
                ]);
            }

            expect(session.getCandidates()).toEqual([candidateA, candidateB]);

            // Try 4: v9 votes for valid candidate A, v10 tries to vote for invalid candidate C
            session.registerVote(new ConclaveVote(makeUser("v9"), candidateA));

            expect(() => session.registerVote(new ConclaveVote(makeUser("v10"), candidateC))).toThrow(
                "Voted candidate is not one of the two most voted of the last call"
            );

            // v9's valid vote was NOT erased, so counting now elects candidate A
            session.countVotes();
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should elect candidate with > 50% of votes after 3 tries (even if < 2/3)", () => {
            const session = new ConclaveVotingSession(allCandidates);

            for (let i = 0; i < 3; i++) {
                castVotes(session, [
                    new ConclaveVote(makeUser("v1"), candidateA),
                    new ConclaveVote(makeUser("v2"), candidateA),
                    new ConclaveVote(makeUser("v3"), candidateB),
                    new ConclaveVote(makeUser("v4"), candidateB),
                    new ConclaveVote(makeUser("v5"), candidateC),
                ]);
            }

            expect(session.getCandidates()).toEqual([candidateA, candidateB]);

            // Try 4: B gets 3/5 (60% > 50%, though < 2/3) -> B must be elected
            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateB),
                new ConclaveVote(makeUser("v2"), candidateB),
                new ConclaveVote(makeUser("v3"), candidateB),
                new ConclaveVote(makeUser("v4"), candidateA),
                new ConclaveVote(makeUser("v5"), candidateA),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateB);
        });

        test("should use alphabetical order as determinator in case of a tie after 3 tries", () => {
            const session = new ConclaveVotingSession(allCandidates);

            // Try 1 & 2
            for (let i = 0; i < 2; i++) {
                castVotes(session, [
                    new ConclaveVote(makeUser("v1"), candidateA),
                    new ConclaveVote(makeUser("v2"), candidateB),
                    new ConclaveVote(makeUser("v3"), candidateC),
                ]);
            }

            // Try 3: C and B are the two most voted
            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateC),
                new ConclaveVote(makeUser("v2"), candidateC),
                new ConclaveVote(makeUser("v3"), candidateB),
                new ConclaveVote(makeUser("v4"), candidateB),
                new ConclaveVote(makeUser("v5"), candidateA),
            ]);

            expect(session.getCandidates()).toEqual([candidateB, candidateC]);

            // Try 4: 50%-50% tie between C and B -> Candidate B wins by alphabetical order
            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateC),
                new ConclaveVote(makeUser("v2"), candidateC),
                new ConclaveVote(makeUser("v3"), candidateB),
                new ConclaveVote(makeUser("v4"), candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateB);
        });

        test("should reset currentCall and result when setCandidates is called to start a new election", () => {
            const session = new ConclaveVotingSession(allCandidates);

            // Exhaust 3 tries so currentCall reaches 3
            for (let i = 0; i < 3; i++) {
                castVotes(session, [
                    new ConclaveVote(makeUser("v1"), candidateA),
                    new ConclaveVote(makeUser("v2"), candidateA),
                    new ConclaveVote(makeUser("v3"), candidateB),
                    new ConclaveVote(makeUser("v4"), candidateB),
                    new ConclaveVote(makeUser("v5"), candidateC),
                ]);
            }

            expect(session.getCurrentCall()).toBe(3);

            // Finish election on 4th try
            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateA),
                new ConclaveVote(makeUser("v3"), candidateB),
            ]);
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);

            // Start a brand new election via public setCandidates
            session.setCandidates(allCandidates);
            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(0);
            expect(() => session.getResult()).toThrow(
                "Result is only available after Counting is complete."
            );

            // In the 1st round of the new election, 2/5 votes (40%) must NOT elect a candidate
            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateA),
                new ConclaveVote(makeUser("v3"), candidateB),
                new ConclaveVote(makeUser("v4"), candidateC),
                new ConclaveVote(makeUser("v5"), candidateD),
            ]);

            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);
            expect(() => session.getResult()).toThrow(
                "Result is only available after Counting is complete."
            );
        });

    });

    describe("Two-thirds boundary cases", () => {

        test("should elect with exactly 4/6 votes", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateA),
                new ConclaveVote(makeUser("v3"), candidateA),
                new ConclaveVote(makeUser("v4"), candidateA),
                new ConclaveVote(makeUser("v5"), candidateB),
                new ConclaveVote(makeUser("v6"), candidateB),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

        test("should not elect with a result just below two-thirds", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateA),
                new ConclaveVote(makeUser("v3"), candidateA),
                new ConclaveVote(makeUser("v4"), candidateB),
                new ConclaveVote(makeUser("v5"), candidateB),
            ]);

            // 3/5 < 2/3
            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getCurrentCall()).toBe(1);
        });

        test("should elect with a result above two-thirds", () => {
            const session = new ConclaveVotingSession(allCandidates);

            castVotes(session, [
                new ConclaveVote(makeUser("v1"), candidateA),
                new ConclaveVote(makeUser("v2"), candidateA),
                new ConclaveVote(makeUser("v3"), candidateA),
                new ConclaveVote(makeUser("v4"), candidateA),
                new ConclaveVote(makeUser("v5"), candidateB),
            ]);

            // 4/5 > 2/3
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(candidateA);
        });

    });

});