import { expect, test, describe } from "vitest";
import {
    VotingSession,
    SessionState,
    ConclaveVote,
    ONUVote,
    CondominiumVote,
    type ICandidate,
    type IVote,
    type ICountingStrategy,
} from "./voting-session"

describe("VotingSession - State Machine and Mocking", () => {

    test("Should strictly follow the planned state flow", () => {
        const mockStrategy: ICountingStrategy<IVote, boolean> = {
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

        // Business Rule Infraction
        expect(session.openSession()).toThrow("Session can only start Voting right after Opening.");
    });

    test("Should handle boolean and candidate results", () => {
        // -=-=-=-=-=-=-=-=-=- Boolean Result -=-=-=-=-=-=-=-=-=-

        const mockBooleanStrategy: ICountingStrategy<ONUVote, boolean> = {
            calculate: () => true
        };

        const booleanSession = new VotingSession(mockBooleanStrategy);
        booleanSession.openSession();
        booleanSession.startVoting();
        booleanSession.closeVoting();
        booleanSession.countVotes();

        expect(booleanSession.getState()).toBe(SessionState.Result);
        expect(booleanSession.getResult()).toBe(true);

        // -=-=-=-=-=-=-=-=-=- Candidate Result -=-=-=-=-=-=-=-=-=-

        const mockWinningCandidate: ICandidate = {
            candidateId: "cand-7",
            name: "Setti"
        }

        const mockCandidateStrategy: ICountingStrategy<ConclaveVote, ICandidate> = {
            calculate: () => mockWinningCandidate
        };

        const candidateSession = new VotingSession(mockCandidateStrategy);
        candidateSession.openSession();
        candidateSession.startVoting();
        candidateSession.closeVoting();
        candidateSession.countVotes();

        expect(candidateSession.getState()).toBe(SessionState.Result);
        expect(candidateSession.getResult()).toEqual(mockWinningCandidate);
    });

    test("Should block vote registration if state is not Voting and register if it is", () => {
        const mockStrategy: ICountingStrategy<ONUVote, boolean> = {
            calculate: (votes) => votes.length > 0
        };
        
        const session = new VotingSession(mockStrategy);

        const mockVote: ONUVote = {
            voterId: '7',
            value: 'yes',
            isPermanentMember: false
        };

        // Should block vote registration since it is during Setup
        expect(() => session.registerVote(mockVote)).toThrow(
            "Votes can only be registered during Voting state."
        );

        // Getting the session to Voting state
        session.openSession();
        session.startVoting();

        // Should register vote
        session.registerVote(mockVote);

        // Getting the session to Result state
        session.closeVoting();
        session.countVotes();

        // Vote should've been correctly registered and result be available
        expect(session.getResult()).toBe(true);
    });

    test("Should enforce null guards for constructor and registerVote", () => {
        // @ts-expect-error Forcing error to ensure null guard works
        expect(() => new VotingSession(null)).toThrow(
            "Strategy cannot be null."
        );

        const session = new VotingSession({ calculate: () => true });
        session.openSession();
        session.startVoting();
        
        // @ts-expect-error Forcing error to ensure null guard works
        expect(() => session.registerVote(null)).toThrow(
            "Vote cannot be null."
        );
    });
    
});