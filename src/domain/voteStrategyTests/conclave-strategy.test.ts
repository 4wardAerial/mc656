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

    const candidateD: ICandidate = {
        candidateId: "D",
        name: "Candidate D"
    };


    test("should throw an error when there are no votes", () => {
        const strategy = new ConclaveCountingStrategy();

        expect(() => strategy.calculate([])).toThrow(
            "Number of Votes must not be 0"
        );
    });


    describe("Election before candidate restriction", () => {

        test("should elect a candidate with exactly 2/3 of the votes in the first voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const votes: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateB),
            ];

            expect(strategy.calculate(votes)).toEqual(candidateA);
        });


        test("should elect a candidate with more than 2/3 of the votes in the first voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const votes: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateB),
            ];

            expect(strategy.calculate(votes)).toEqual(candidateA);
        });


        test("should not elect a candidate with less than 2/3 of the votes in the first voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const votes: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateB),
            ];

            // 3/5 < 2/3

            expect(strategy.calculate(votes)).toBe(false);
        });


        test("should elect a candidate with exactly 2/3 of the votes in the second voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const firstVoting: ConclaveVote[] = [
                new ConclaveVote("v1", candidateB),
                new ConclaveVote("v2", candidateC),
                new ConclaveVote("v3", candidateD),
            ];

            expect(strategy.calculate(firstVoting)).toBe(false);

            const secondVoting: ConclaveVote[] = [
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateA),
                new ConclaveVote("v6", candidateB),
            ];

            expect(strategy.calculate(secondVoting)).toEqual(candidateA);
        });


        test("should not elect a candidate with less than 2/3 of the votes in the second voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const firstVoting: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateB),
                new ConclaveVote("v3", candidateC),
            ];

            expect(strategy.calculate(firstVoting)).toBe(false);

            const secondVoting: ConclaveVote[] = [
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateA),
                new ConclaveVote("v6", candidateB),
                new ConclaveVote("v7", candidateB),
                new ConclaveVote("v8", candidateC),
            ];

            // 2/5 < 2/3

            expect(strategy.calculate(secondVoting)).toBe(false);
        });

    });


    describe("Election with a single candidate", () => {

        test("should elect the only candidate receiving votes", () => {
            const strategy = new ConclaveCountingStrategy();

            const votes: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
            ];

            expect(strategy.calculate(votes)).toEqual(candidateA);
        });


        test("should elect the only candidate even if the number of votes is one", () => {
            const strategy = new ConclaveCountingStrategy();

            const votes: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
            ];

            expect(strategy.calculate(votes)).toEqual(candidateA);
        });


        test("should elect the only allowed candidate after the tolerance period", () => {
            const strategy = new ConclaveCountingStrategy();

            const firstVoting: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateB),
            ];

            expect(strategy.calculate(firstVoting)).toEqual(candidateA);

            // This test cannot continue after an election because the
            // strategy is expected to represent a concluded conclave.

            const independentStrategy = new ConclaveCountingStrategy();

            const firstVotingWithoutElection: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateB),
                new ConclaveVote("v3", candidateC),
            ];

            expect(independentStrategy.calculate(firstVotingWithoutElection)).toBe(false);

            const secondVoting: ConclaveVote[] = [
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateB),
                new ConclaveVote("v6", candidateC),
            ];

            expect(independentStrategy.calculate(secondVoting)).toBe(false);

            // A and B are the two most voted candidates.
            // Therefore A is allowed in the third voting.

            const thirdVoting: ConclaveVote[] = [
                new ConclaveVote("v7", candidateA),
            ];

            expect(independentStrategy.calculate(thirdVoting)).toEqual(candidateA);
        });

    });


    describe("Tracking the two most voted candidates", () => {

        test("should store the two most voted candidates from the previous voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const firstVoting: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateB),
                new ConclaveVote("v6", candidateC),
            ];

            expect(strategy.calculate(firstVoting)).toBe(false);

            // A and B are the two most voted.
            // Therefore C must not be allowed in the third voting.

            const secondVoting: ConclaveVote[] = [
                new ConclaveVote("v7", candidateA),
                new ConclaveVote("v8", candidateB),
            ];

            expect(strategy.calculate(secondVoting)).toBe(false);

            const thirdVoting: ConclaveVote[] = [
                new ConclaveVote("v9", candidateC),
            ];

            expect(() => strategy.calculate(thirdVoting)).toThrow(
                "Voted canditate is not one of the two most voted of the last call"
            );
        });


        test("should update the two most voted candidates after a new voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const firstVoting: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateB),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateC),
            ];

            expect(strategy.calculate(firstVoting)).toBe(false);

            // A and B are the two most voted.


            const secondVoting: ConclaveVote[] = [
                new ConclaveVote("v6", candidateC),
                new ConclaveVote("v7", candidateC),
                new ConclaveVote("v8", candidateC),
                new ConclaveVote("v9", candidateD),
                new ConclaveVote("v10", candidateD),
            ];

            expect(strategy.calculate(secondVoting)).toBe(false);

            // C and D are now the two most voted.


            const thirdVoting: ConclaveVote[] = [
                new ConclaveVote("v11", candidateC),
                new ConclaveVote("v12", candidateD),
            ];

            expect(strategy.calculate(thirdVoting)).toBe(false);
        });


        test("should update the two most voted candidates again in a later voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const firstVoting: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateB),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateC),
            ];

            expect(strategy.calculate(firstVoting)).toBe(false);

            // A and B


            const secondVoting: ConclaveVote[] = [
                new ConclaveVote("v6", candidateC),
                new ConclaveVote("v7", candidateC),
                new ConclaveVote("v8", candidateD),
                new ConclaveVote("v9", candidateD),
            ];

            expect(strategy.calculate(secondVoting)).toBe(false);

            // C and D


            const thirdVoting: ConclaveVote[] = [
                new ConclaveVote("v10", candidateA),
            ];

            expect(() => strategy.calculate(thirdVoting)).toThrow(
                "Voted canditate is not one of the two most voted of the last call"
            );


            // The invalid voting does not alter the two most voted.
            // Therefore C and D are still the valid candidates.

            const thirdVotingValid: ConclaveVote[] = [
                new ConclaveVote("v11", candidateC),
                new ConclaveVote("v12", candidateD),
            ];

            expect(strategy.calculate(thirdVotingValid)).toBe(false);


            // Now C and D should remain the candidates represented by
            // the third voting.

            const fourthVoting: ConclaveVote[] = [
                new ConclaveVote("v13", candidateC),
                new ConclaveVote("v14", candidateD),
            ];

            expect(strategy.calculate(fourthVoting)).toBe(false);
        });

    });


    describe("Candidate restriction after the tolerance period", () => {

        test("should allow both candidates from the previous voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const firstVoting: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateB),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateC),
            ];

            expect(strategy.calculate(firstVoting)).toBe(false);

            const secondVoting: ConclaveVote[] = [
                new ConclaveVote("v6", candidateC),
                new ConclaveVote("v7", candidateB),
                new ConclaveVote("v8", candidateB),
                new ConclaveVote("v9", candidateA),
                new ConclaveVote("V10", candidateA)
            ];

            expect(strategy.calculate(secondVoting)).toBe(false);

            // A and B are the two most voted in the second voting.

            const thirdVoting: ConclaveVote[] = [
                new ConclaveVote("v10", candidateA),
                new ConclaveVote("v11", candidateB),
            ];

            expect(strategy.calculate(thirdVoting)).toBe(false);
        });


        test("should throw an error when a vote is cast for a candidate outside the two most voted of the previous voting", () => {
            const strategy = new ConclaveCountingStrategy();

            const firstVoting: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateB),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateC),
            ];

            expect(strategy.calculate(firstVoting)).toBe(false);

            const secondVoting: ConclaveVote[] = [
                new ConclaveVote("v6", candidateA),
                new ConclaveVote("v7", candidateB),
                new ConclaveVote("v8", candidateA),
            ];

            expect(strategy.calculate(secondVoting)).toBe(false);

            // A and B are now the only allowed candidates.

            const thirdVoting: ConclaveVote[] = [
                new ConclaveVote("v9", candidateA),
                new ConclaveVote("v10", candidateC),
            ];

            expect(() => strategy.calculate(thirdVoting)).toThrow(
                "Voted canditate is not one of the two most voted of the last call"
            );
        });


        test("should reject the invalid candidate even if the other votes would give someone 2/3", () => {
            const strategy = new ConclaveCountingStrategy();

            const firstVoting: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateB),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateC),
            ];

            expect(strategy.calculate(firstVoting)).toBe(false);

            const secondVoting: ConclaveVote[] = [
                new ConclaveVote("v6", candidateA),
                new ConclaveVote("v7", candidateB),
                new ConclaveVote("v8", candidateA),
            ];

            expect(strategy.calculate(secondVoting)).toBe(false);

            // A would have 2/3 of the votes, but C is not allowed.

            const thirdVoting: ConclaveVote[] = [
                new ConclaveVote("v9", candidateA),
                new ConclaveVote("v10", candidateA),
                new ConclaveVote("v11", candidateC),
            ];

            expect(() => strategy.calculate(thirdVoting)).toThrow(
                "Voted canditate is not one of the two most voted of the last call"
            );
        });

    });


    describe("Two-thirds boundary cases", () => {

        test("should elect with exactly 4/6 votes", () => {
            const strategy = new ConclaveCountingStrategy();

            const votes: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateB),
                new ConclaveVote("v6", candidateB),
            ];

            // 4/6 == 2/3

            expect(strategy.calculate(votes)).toEqual(candidateA);
        });


        test("should not elect with a result just below two-thirds", () => {
            const strategy = new ConclaveCountingStrategy();

            const votes: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateB),
                new ConclaveVote("v5", candidateB),
            ];

            // 3/5 < 2/3

            expect(strategy.calculate(votes)).toBe(false);
        });


        test("should elect with a result above two-thirds", () => {
            const strategy = new ConclaveCountingStrategy();

            const votes: ConclaveVote[] = [
                new ConclaveVote("v1", candidateA),
                new ConclaveVote("v2", candidateA),
                new ConclaveVote("v3", candidateA),
                new ConclaveVote("v4", candidateA),
                new ConclaveVote("v5", candidateB),
            ];

            // 4/5 > 2/3

            expect(strategy.calculate(votes)).toEqual(candidateA);
        });

    });

});
