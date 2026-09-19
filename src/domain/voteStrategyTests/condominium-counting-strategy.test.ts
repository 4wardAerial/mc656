
import { expect, test, describe } from "vitest";

import {
    CondominiumVote,
    CondominiumCountingStrategy
} from "../counting-strategy";


describe("CondominiumCountingStrategy", () => {

    test("should throw an error when there are no votes", () => {
        const strategy = new CondominiumCountingStrategy();

        expect(() => strategy.calculate([])).toThrow(
            "Number of Votes must not be 0"
        );
    });


    describe("first vote", () => {

        test("should approve when yes weight is greater than 0.5", () => {
            const strategy = new CondominiumCountingStrategy();

            const votes = [
                new CondominiumVote("v0", 0.30, "yes"),
                new CondominiumVote("v1", 0.30, "yes"),
                new CondominiumVote("v2", 0.20, "no"),
                new CondominiumVote("v3", 0.20, "abstention"),
            ];

            // yes = 0.60 > 0.50
            // total = 1.00

            expect(strategy.calculate(votes)).toBe(true);
        });


        test("should reject when yes weight is exactly 0.5", () => {
            const strategy = new CondominiumCountingStrategy();

            const votes = [
                new CondominiumVote("v0", 0.30, "yes"),
                new CondominiumVote("v1", 0.20, "yes"),
                new CondominiumVote("v2", 0.30, "no"),
                new CondominiumVote("v3", 0.20, "abstention"),
            ];

            // yes = 0.50
            // The rule is strictly greater than 0.5.

            expect(strategy.calculate(votes)).toBe(false);
        });


        test("should reject when yes weight is below 0.5", () => {
            const strategy = new CondominiumCountingStrategy();

            const votes = [
                new CondominiumVote("v1", 0.40, "yes"),
                new CondominiumVote("v2", 0.30, "no"),
                new CondominiumVote("v3", 0.20, "abstention"),
            ];

            expect(strategy.calculate(votes)).toBe(false);
        });


        test("should reject even when yes is the majority among the received votes", () => {
            const strategy = new CondominiumCountingStrategy();

            const votes = [
                new CondominiumVote("v1", 0.40, "yes"),
                new CondominiumVote("v2", 0.20, "no"),
            ];

            // First-call rule:
            // yes = 0.40 <= 0.50 -> false
            //
            // However, among the received votes:
            // 0.40 / 0.60 > 0.50
            //
            // This confirms that the first vote uses the absolute
            // 50% threshold of the whole condominium.

            expect(strategy.calculate(votes)).toBe(false);
        });


        test("should work when all condominium ownership is represented", () => {
            const strategy = new CondominiumCountingStrategy();

            const votes = [
                new CondominiumVote("v1", 0.51, "yes"),
                new CondominiumVote("v2", 0.49, "no"),
            ];

            expect(strategy.calculate(votes)).toBe(true);
        });


        test("should approve when a single owner has more than half of the condominium", () => {
            const strategy = new CondominiumCountingStrategy();

            const votes = [
                new CondominiumVote("v1", 0.60, "yes"),
            ];

            expect(strategy.calculate(votes)).toBe(true);
        });

    });


    describe("second and subsequent votes", () => {

        test("should use the total weight of the received votes as the threshold", () => {
            const strategy = new CondominiumCountingStrategy();

            const firstVotes = [
                new CondominiumVote("v1", 0.30, "yes"),
            ];

            const secondVotes = [
                new CondominiumVote("v1", 0.40, "yes"),
                new CondominiumVote("v2", 0.20, "no"),
            ];

            expect(strategy.calculate(firstVotes)).toBe(false);

            // Second call:
            // yes = 0.40
            // total = 0.60
            // half = 0.30
            // 0.40 > 0.30 -> true

            expect(strategy.calculate(secondVotes)).toBe(true);
        });


        test("should reject when yes weight is exactly half of the received voting weight", () => {
            const strategy = new CondominiumCountingStrategy();

            const firstVotes = [
                new CondominiumVote("v1", 0.30, "yes"),
            ];

            const secondVotes = [
                new CondominiumVote("v1", 0.30, "yes"),
                new CondominiumVote("v2", 0.30, "no"),
            ];

            expect(strategy.calculate(firstVotes)).toBe(false);
            expect(strategy.calculate(secondVotes)).toBe(false);
        });


        test("should reject when yes weight is below half of the received voting weight", () => {
            const strategy = new CondominiumCountingStrategy();

            const firstVotes = [
                new CondominiumVote("v1", 0.30, "yes"),
            ];

            const secondVotes = [
                new CondominiumVote("v1", 0.25, "yes"),
                new CondominiumVote("v2", 0.30, "no"),
                new CondominiumVote("v3", 0.10, "abstention"),
            ];

            // yes = 0.25
            // total = 0.65
            // half = 0.325
            // 0.25 < 0.325 -> false

            expect(strategy.calculate(firstVotes)).toBe(false);
            expect(strategy.calculate(secondVotes)).toBe(false);
        });


        test("should approve when yes weight is just above half of the received voting weight", () => {
            const strategy = new CondominiumCountingStrategy();

            const firstVotes = [
                new CondominiumVote("v1", 0.30, "yes"),
            ];

            const secondVotes = [
                new CondominiumVote("v1", 0.31, "yes"),
                new CondominiumVote("v2", 0.29, "no"),
            ];

            // yes = 0.31
            // total = 0.60
            // half = 0.30
            // 0.31 > 0.30 -> true

            expect(strategy.calculate(firstVotes)).toBe(false);
            expect(strategy.calculate(secondVotes)).toBe(true);
        });


        test("should count abstentions in total weight but not in yes weight", () => {
            const strategy = new CondominiumCountingStrategy();

            const firstVotes = [
                new CondominiumVote("v1", 0.30, "yes"),
            ];

            const secondVotes = [
                new CondominiumVote("v1", 0.30, "yes"),
                new CondominiumVote("v2", 0.20, "abstention"),
                new CondominiumVote("v3", 0.10, "no"),
            ];

            // yes = 0.30
            // total = 0.60
            // half = 0.30
            // 0.30 is not greater than 0.30 -> false

            expect(strategy.calculate(firstVotes)).toBe(false);
            expect(strategy.calculate(secondVotes)).toBe(false);
        });


        test("should reject when all received votes are no", () => {
            const strategy = new CondominiumCountingStrategy();

            const firstVotes = [
                new CondominiumVote("v1", 0.30, "yes"),
            ];

            const secondVotes = [
                new CondominiumVote("v1", 0.30, "no"),
                new CondominiumVote("v2", 0.20, "no"),
                new CondominiumVote("v3", 0.10, "no"),
            ];

            expect(strategy.calculate(firstVotes)).toBe(false);
            expect(strategy.calculate(secondVotes)).toBe(false);
        });


        test("should reject when all received votes are abstentions", () => {
            const strategy = new CondominiumCountingStrategy();

            const firstVotes = [
                new CondominiumVote("v1", 0.30, "yes"),
            ];

            const secondVotes = [
                new CondominiumVote("v1", 0.30, "abstention"),
                new CondominiumVote("v2", 0.20, "abstention"),
            ];

            expect(strategy.calculate(firstVotes)).toBe(false);
            expect(strategy.calculate(secondVotes)).toBe(false);
        });

    });

});

