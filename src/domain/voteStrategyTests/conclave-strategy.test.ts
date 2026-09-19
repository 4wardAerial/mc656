import { expect, test, describe } from "vitest";

import {
    type ICandidate,
    ConclaveVote,
    ConclaveCountingStrategy
} from "../counting-strategy";


describe("ConclaveCountingStrategy", () => {

    const candidateA: ICandidate = {
        candidateId: "A",
        name: "Candidate A"
    };

    const candidateB: ICandidate = {
        candidateId: "B",
        name: "Candidate B"
    };

    const candidateC: ICandidate = {
        candidateId: "C",
        name: "Candidate C"
    };


    test("should throw an error when there are no votes", () => {
        const strategy = new ConclaveCountingStrategy();

        expect(() => strategy.calculate([])).toThrow(
            "Number of Votes must not be 0"
        );
    });


    test("should elect the candidate when they receive exactly two-thirds of the votes", () => {
        const strategy = new ConclaveCountingStrategy();

        const votes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateA),
            new ConclaveVote("v3", candidateB),
        ];

        expect(strategy.calculate(votes)).toEqual(candidateA);
    });


    test("should elect the candidate when they receive more than two-thirds of the votes", () => {
        const strategy = new ConclaveCountingStrategy();

        const votes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateA),
            new ConclaveVote("v3", candidateA),
            new ConclaveVote("v4", candidateB),
        ];

        expect(strategy.calculate(votes)).toEqual(candidateA);
    });


    test("should not elect a candidate when they receive less than two-thirds of the votes", () => {
        const strategy = new ConclaveCountingStrategy();

        const votes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateA),
            new ConclaveVote("v3", candidateB),
            new ConclaveVote("v4", candidateB),
        ];

        expect(strategy.calculate(votes)).toBe(false);
    });


    test("should elect the only candidate that receives votes", () => {
        const strategy = new ConclaveCountingStrategy();

        const votes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateA),
            new ConclaveVote("v3", candidateA),
        ];

        expect(strategy.calculate(votes)).toEqual(candidateA);
    });


    test("should count votes using candidateId", () => {
        const strategy = new ConclaveCountingStrategy();

        const candidateA1: ICandidate = {
            candidateId: "A",
            name: "Candidate A"
        };

        const candidateA2: ICandidate = {
            candidateId: "A",
            name: "Candidate A"
        };

        const votes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA1),
            new ConclaveVote("v2", candidateA2),
            new ConclaveVote("v3", candidateB),
        ];

        // Both votes have candidateId "A", so A has 2/3 of the votes.

        expect(strategy.calculate(votes)).toEqual(candidateA2);
    });


    test("should allow any candidate in the first voting", () => {
        const strategy = new ConclaveCountingStrategy();

        const votes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateB),
            new ConclaveVote("v3", candidateC),
        ];

        expect(strategy.calculate(votes)).toBe(false);
    });


    test("should allow any candidate in the second voting", () => {
        const strategy = new ConclaveCountingStrategy();

        const firstVotes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateA),
            new ConclaveVote("v3", candidateB),
            new ConclaveVote("v4", candidateB),
            new ConclaveVote("v5", candidateC),
        ];

        expect(strategy.calculate(firstVotes)).toBe(false);

        const secondVotes: ConclaveVote[] = [
            new ConclaveVote("v6", candidateC),
            new ConclaveVote("v7", candidateC),
            new ConclaveVote("v8", candidateB),
            new ConclaveVote("v9", candidateA),
        ];

        // Candidate C was not among the two most voted in the first
        // voting, but every candidate is still allowed in the second voting.

        expect(strategy.calculate(secondVotes)).toBe(false);
    });


    test("should reject a candidate that is not among the two most voted in the previous voting", () => {
        const strategy = new ConclaveCountingStrategy();

        const firstVotes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateA),
            new ConclaveVote("v3", candidateA),
            new ConclaveVote("v4", candidateB),
            new ConclaveVote("v5", candidateB),
            new ConclaveVote("v6", candidateC),
        ];

        expect(strategy.calculate(firstVotes)).toBe(false);

        const secondVotes: ConclaveVote[] = [
            new ConclaveVote("v7", candidateA),
            new ConclaveVote("v8", candidateB),
        ];

        expect(strategy.calculate(secondVotes)).toBe(false);

        // Third voting:
        // The candidates allowed are A and B.
        // C was not among the two most voted in the previous voting.

        const thirdVotes: ConclaveVote[] = [
            new ConclaveVote("v9", candidateC),
        ];

        expect(() => strategy.calculate(thirdVotes)).toThrow(
            "Voted canditate is not one of the two most voted of the last call"
        );
    });


    test("should allow the two candidates from the previous voting", () => {
        const strategy = new ConclaveCountingStrategy();

        const firstVotes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateA),
            new ConclaveVote("v3", candidateB),
            new ConclaveVote("v4", candidateB),
            new ConclaveVote("v5", candidateC),
        ];

        expect(strategy.calculate(firstVotes)).toBe(false);

        const secondVotes: ConclaveVote[] = [
            new ConclaveVote("v6", candidateA),
            new ConclaveVote("v7", candidateA),
            new ConclaveVote("v8", candidateB),
        ];

        expect(strategy.calculate(secondVotes)).toBe(false);

        const thirdVotes: ConclaveVote[] = [
            new ConclaveVote("v9", candidateA),
            new ConclaveVote("v10", candidateB),
        ];

        expect(strategy.calculate(thirdVotes)).toBe(false);
    });


    test("should update the two most voted candidates after each voting", () => {
        const strategy = new ConclaveCountingStrategy();

        const firstVotes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateA),
            new ConclaveVote("v3", candidateB),
            new ConclaveVote("v4", candidateB),
            new ConclaveVote("v5", candidateC),
        ];

        expect(strategy.calculate(firstVotes)).toBe(false);

        // A and B are the two most voted candidates.

        const secondVotes: ConclaveVote[] = [
            new ConclaveVote("v6", candidateC),
            new ConclaveVote("v7", candidateC),
            new ConclaveVote("v8", candidateC),
            new ConclaveVote("v9", candidateB),
        ];

        expect(strategy.calculate(secondVotes)).toBe(false);

        // C and B are now the two most voted candidates.

        const thirdVotes: ConclaveVote[] = [
            new ConclaveVote("v10", candidateC),
            new ConclaveVote("v11", candidateB),
        ];

        expect(strategy.calculate(thirdVotes)).toBe(false);
    });


    test("should reject when one vote is cast for an invalid candidate from the third voting onward", () => {
        const strategy = new ConclaveCountingStrategy();

        const firstVotes: ConclaveVote[] = [
            new ConclaveVote("v1", candidateA),
            new ConclaveVote("v2", candidateA),
            new ConclaveVote("v3", candidateB),
            new ConclaveVote("v4", candidateB),
            new ConclaveVote("v5", candidateC),
        ];

        expect(strategy.calculate(firstVotes)).toBe(false);

        const secondVotes: ConclaveVote[] = [
            new ConclaveVote("v6", candidateA),
            new ConclaveVote("v7", candidateB),
            new ConclaveVote("v8", candidateA),
        ];

        expect(strategy.calculate(secondVotes)).toBe(false);

        // A and B are allowed.
        // C is not allowed.

        const thirdVotes: ConclaveVote[] = [
            new ConclaveVote("v9", candidateA),
            new ConclaveVote("v10", candidateC),
        ];

        expect(() => strategy.calculate(thirdVotes)).toThrow(
            "Voted canditate is not one of the two most voted of the last call"
        );
    });


    test("should use the candidate object from the last vote when the same candidateId appears more than once", () => {
        const strategy = new ConclaveCountingStrategy();

        const firstCandidateA: ICandidate = {
            candidateId: "A",
            name: "First name"
        };

        const secondCandidateA: ICandidate = {
            candidateId: "A",
            name: "Second name"
        };

        const votes: ConclaveVote[] = [
            new ConclaveVote("v1", firstCandidateA),
            new ConclaveVote("v2", secondCandidateA),
            new ConclaveVote("v3", candidateB),
        ];

        const result = strategy.calculate(votes);

        expect(result).toEqual(secondCandidateA);
    });

});
