import { expect, test, describe } from "vitest";
import {
    VotingSession,
    ConclaveVotingSession,
    CondominiumVotingSession,
    ONUVotingSession,
    SessionState,
    SessionType,
} from "./voting-session.js";
import {
    ConclaveVote,
    CondominiumVote,
    ONUVote,
} from "./vote.js";

describe("VotingSession Hierarchy and State Machine", () => {

    test("Concrete classes should inherit from VotingSession and set proper SessionType", () => {
        const conclaveSession = new ConclaveVotingSession(["Candidate A", "Candidate B"], "session-1");
        const condoSession = new CondominiumVotingSession("Pool Reform", "session-2");
        const onuSession = new ONUVotingSession("Resolution 42", "session-3");

        expect(conclaveSession).toBeInstanceOf(VotingSession);
        expect(condoSession).toBeInstanceOf(VotingSession);
        expect(onuSession).toBeInstanceOf(VotingSession);

        expect(conclaveSession.getSessionType()).toBe(SessionType.CONCLAVE);
        expect(condoSession.getSessionType()).toBe(SessionType.CONDOMINIUM);
        expect(onuSession.getSessionType()).toBe(SessionType.ONU);

        expect(conclaveSession.getSessionId()).toBe("session-1");
        expect(condoSession.getTopic()).toBe("Pool Reform");
        expect(onuSession.getTopic()).toBe("Resolution 42");
    });

    test("Should start in VOTING state when setup and transition to RESULT after successful countVotes", () => {
        const session = new CondominiumVotingSession("Budget Approval");
        expect(session.getState()).toBe(SessionState.VOTING);

        session.registerVote(new CondominiumVote("v1", 0.6, "yes"));
        session.countVotes();

        expect(session.getState()).toBe(SessionState.RESULT);
        expect(session.getResult()).toBe(true);
    });

    test("Should allow out-of-order state changes via setCandidates and setTopic and reset previous results", () => {
        // Condominium / ONU: setTopic resets state to VOTING and clears previous result
        const onuSession = new ONUVotingSession("Topic 1");
        for (let i = 1; i <= 9; i++) {
            onuSession.registerVote(new ONUVote(`v${i}`, "yes"));
        }
        onuSession.countVotes();
        expect(onuSession.getState()).toBe(SessionState.RESULT);
        expect(onuSession.getResult()).toBe(true);

        // Resetting session with a new topic from RESULT state
        onuSession.setTopic("Topic 2");
        expect(onuSession.getState()).toBe(SessionState.VOTING);
        expect(onuSession.getTopic()).toBe("Topic 2");
        expect(() => onuSession.getResult()).toThrow(
            "Result is only available after Counting is complete."
        );

        // Same voter 'v1' can vote again because votes were cleared
        onuSession.registerVote(new ONUVote("v1", "no", true));
        onuSession.countVotes();
        expect(onuSession.getState()).toBe(SessionState.RESULT);
        expect(onuSession.getResult()).toBe(false);

        // Conclave: setCandidates resets state to VOTING and clears previous result
        const conclaveSession = new ConclaveVotingSession(["Setti", "Frare"]);
        conclaveSession.registerVote(new ConclaveVote("v1", "Setti"));
        conclaveSession.countVotes();
        expect(conclaveSession.getState()).toBe(SessionState.RESULT);
        expect(conclaveSession.getResult()).toBe("Setti");

        conclaveSession.setCandidates(["Lucas", "Ana"]);
        expect(conclaveSession.getState()).toBe(SessionState.VOTING);
        expect(conclaveSession.getCandidates()).toEqual(["Lucas", "Ana"]);
        expect(conclaveSession.getCurrentCall()).toBe(0);
        expect(() => conclaveSession.getResult()).toThrow(
            "Result is only available after Counting is complete."
        );
    });

    test("Should block vote registration and countVotes if state is not VOTING", () => {
        const condoSession = new CondominiumVotingSession("Topic");
        condoSession.registerVote(new CondominiumVote("v1", 0.7, "yes"));
        condoSession.countVotes();

        expect(condoSession.getState()).toBe(SessionState.RESULT);

        expect(() => condoSession.registerVote(new CondominiumVote("v2", 0.3, "yes"))).toThrow(
            "Votes can only be registered during Voting state."
        );
        expect(() => condoSession.countVotes()).toThrow(
            "Session can only start Counting right after Voting."
        );

        const conclaveSession = new ConclaveVotingSession(["Setti"]);
        conclaveSession.registerVote(new ConclaveVote("v1", "Setti"));
        conclaveSession.countVotes();
        expect(() => conclaveSession.registerVote(new ConclaveVote("v2", "Setti"))).toThrow(
            "Votes can only be registered during Voting state."
        );
        expect(() => conclaveSession.countVotes()).toThrow(
            "Session can only start Counting right after Voting."
        );

        const onuSession = new ONUVotingSession("Topic");
        onuSession.registerVote(new ONUVote("v1", "no", true));
        onuSession.countVotes();
        expect(() => onuSession.countVotes()).toThrow(
            "Session can only start Counting right after Voting."
        );
    });

    test("Should enforce null guards and duplicate vote check in registerVote and getResult", () => {
        const session = new ONUVotingSession("Security Resolution");

        expect(() => session.getResult()).toThrow(
            "Result is only available after Counting is complete."
        );

        // @ts-expect-error Forcing error to ensure null guard works
        expect(() => session.registerVote(null)).toThrow(
            "Vote cannot be null."
        );

        const conclaveSession = new ConclaveVotingSession(["Setti"]);
        // @ts-expect-error Forcing error to ensure null guard works
        expect(() => conclaveSession.registerVote(null)).toThrow(
            "Vote cannot be null."
        );

        session.registerVote(new ONUVote("v1", "yes"));
        expect(() => session.registerVote(new ONUVote("v1", "no"))).toThrow(
            "Duplicate vote for voterId: v1"
        );
    });

});
