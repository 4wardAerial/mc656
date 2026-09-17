import { expect, test, describe } from "vitest";
import { VotingSession, SessionState, type ICountingStrategy, type IVote } from "./voting-session";

describe("VotingSession - State Machine and Mocking", () => {

    test("Should strictly follow the planned state flow", () => {
        const mockStrategy: ICountingStrategy = {
            calculate: () => true
        };

        const session = new VotingSession(mockStrategy);
        expect(session.getState()).toBe(SessionState.Setup);

        session.openSession();
        expect(session.getState()).toBe(SessionState.Opening);

        session.startVoting();
        expect(session.getState()).toBe(SessionState.Voting);
        
        session.closeVoting();
        expect(session.getState()).toBe(SessionState.Closing);
        
        session.countVotes();
        expect(session.getState()).toBe(SessionState.Result);
        expect(session.getResult()).toBe(true);
    });
})