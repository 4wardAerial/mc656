import { expect, test, describe } from "vitest";
import { CondominiumVotingSession, SessionState } from "../voting-session.js";
import { CondominiumVote } from "../vote.js";

describe("CondominiumVotingSession", () => {

    const castVotes = (session: CondominiumVotingSession, votes: CondominiumVote[]): void => {
        for (const vote of votes) {
            session.registerVote(vote);
        }
        session.countVotes();
    };

    test("should throw an error when there are no votes", () => {
        const session = new CondominiumVotingSession("Fee Adjustment");

        expect(() => session.countVotes()).toThrow(
            "Number of Votes must not be 0"
        );
        expect(session.getState()).toBe(SessionState.VOTING);
    });

    describe("first vote", () => {

        test("should approve when yes weight is greater than 0.5", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v0", 0.30, "yes"),
                new CondominiumVote("v1", 0.30, "yes"),
                new CondominiumVote("v2", 0.20, "no"),
                new CondominiumVote("v3", 0.20, "abstention"),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(true);
        });

        test("should reject when yes weight is exactly 0.5", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v0", 0.30, "yes"),
                new CondominiumVote("v1", 0.20, "yes"),
                new CondominiumVote("v2", 0.30, "no"),
                new CondominiumVote("v3", 0.20, "abstention"),
            ]);

            expect(session.getResult()).toBe(false);
            expect(session.getState()).toBe(SessionState.VOTING);
        });

        test("should reject when yes weight is below 0.5", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.40, "yes"),
                new CondominiumVote("v2", 0.30, "no"),
                new CondominiumVote("v3", 0.20, "abstention"),
            ]);

            expect(session.getResult()).toBe(false);
            expect(session.getState()).toBe(SessionState.VOTING);
        });

        test("should reject even when yes is the majority among the received votes", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.40, "yes"),
                new CondominiumVote("v2", 0.20, "no"),
            ]);

            expect(session.getResult()).toBe(false);
            expect(session.getState()).toBe(SessionState.VOTING);
        });

        test("should work when all condominium ownership is represented", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.51, "yes"),
                new CondominiumVote("v2", 0.49, "no"),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(true);
        });

        test("should approve when a single owner has more than half of the condominium", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.60, "yes"),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(true);
        });

    });

    describe("second and subsequent votes", () => {

        test("should use the total weight of the received votes as the threshold", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
            ]);

            expect(session.getResult()).toBe(false);
            expect(session.getState()).toBe(SessionState.VOTING);

            castVotes(session, [
                new CondominiumVote("v1", 0.40, "yes"),
                new CondominiumVote("v2", 0.20, "no"),
            ]);

            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(true);
        });

        test("should reject when yes weight is exactly half of the received voting weight", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
            ]);
            expect(session.getResult()).toBe(false);

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
                new CondominiumVote("v2", 0.30, "no"),
            ]);
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(false);
        });

        test("should reject when yes weight is below half of the received voting weight", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
            ]);
            expect(session.getResult()).toBe(false);

            castVotes(session, [
                new CondominiumVote("v1", 0.25, "yes"),
                new CondominiumVote("v2", 0.30, "no"),
                new CondominiumVote("v3", 0.10, "abstention"),
            ]);
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(false);
        });

        test("should approve when yes weight is just above half of the received voting weight", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
            ]);
            expect(session.getResult()).toBe(false);

            castVotes(session, [
                new CondominiumVote("v1", 0.31, "yes"),
                new CondominiumVote("v2", 0.29, "no"),
            ]);
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(true);
        });

        test("should count abstentions in total weight but not in yes weight", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
            ]);
            expect(session.getResult()).toBe(false);

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
                new CondominiumVote("v2", 0.20, "abstention"),
                new CondominiumVote("v3", 0.10, "no"),
            ]);
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(false);
        });

        test("should reject when all received votes are no", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
            ]);
            expect(session.getResult()).toBe(false);

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "no"),
                new CondominiumVote("v2", 0.20, "no"),
                new CondominiumVote("v3", 0.10, "no"),
            ]);
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(false);
        });

        test("should reject when all received votes are abstentions", () => {
            const session = new CondominiumVotingSession("Fee Adjustment");

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
            ]);
            expect(session.getResult()).toBe(false);

            castVotes(session, [
                new CondominiumVote("v1", 0.30, "abstention"),
                new CondominiumVote("v2", 0.20, "abstention"),
            ]);
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(false);
        });

        test("should reset firstCall and result when setTopic is called for a new topic", () => {
            const session = new CondominiumVotingSession("Topic 1");

            // 1st call fails (0.30 <= 0.5)
            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
            ]);
            expect(session.getResult()).toBe(false);

            // 2nd call succeeds with 0.30 > 0.15
            castVotes(session, [
                new CondominiumVote("v1", 0.30, "yes"),
            ]);
            expect(session.getState()).toBe(SessionState.RESULT);
            expect(session.getResult()).toBe(true);

            // Starting a new topic via setTopic must reset firstCall to true and result to null
            session.setTopic("Topic 2");
            expect(session.getState()).toBe(SessionState.VOTING);
            expect(session.getTopic()).toBe("Topic 2");
            expect(() => session.getResult()).toThrow(
                "Result is only available after Counting is complete."
            );

            // 1st call on Topic 2 with only 0.20 weight must be rejected (requires > 0.50)
            castVotes(session, [
                new CondominiumVote("v1", 0.20, "yes"),
            ]);
            expect(session.getResult()).toBe(false);
            expect(session.getState()).toBe(SessionState.VOTING);
        });

    });

});
