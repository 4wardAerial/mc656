import { expect, test, describe } from "vitest";

import {
    ONUVote,
    ONUCountingStrategy,
} from "../counting-strategy"


// Testing ONU Counting Strategy
describe("ONUCountingStrategy", () => {

    test("must throw an error when votes are empty", () => {
        const strategy = new ONUCountingStrategy();

        expect(() => strategy.calculate([])).toThrow(
            "Number of Votes must not be 0"
        );
    });


    test("must approve with exactly 9 votes when they are the majority", () => {
        const strategy = new ONUCountingStrategy();

        const votes = [
            new ONUVote("v1", "yes"),
            new ONUVote("v2", "yes"),
            new ONUVote("v3", "yes"),
            new ONUVote("v4", "yes"),
            new ONUVote("v5", "yes"),
            new ONUVote("v6", "yes"),
            new ONUVote("v7", "yes"),
            new ONUVote("v8", "yes"),
            new ONUVote("v9", "yes"),
            new ONUVote("v10", "no"),
            new ONUVote("v11", "no"),
            new ONUVote("v12", "abstention"),
            new ONUVote("v13", "abstention"),
            new ONUVote("v14", "abstention"),
            new ONUVote("v15", "abstention"),
            new ONUVote("v16", "abstention"),
            new ONUVote("v17", "abstention"),
        ];

        expect(strategy.calculate(votes)).toBe(true);
    });


    test("must reprove with exactly 9 yes votes when they are not majority", () => {
        const strategy = new ONUCountingStrategy();

        const votes = [
            new ONUVote("v1", "yes"),
            new ONUVote("v2", "yes"),
            new ONUVote("v3", "yes"),
            new ONUVote("v4", "yes"),
            new ONUVote("v5", "yes"),
            new ONUVote("v6", "yes"),
            new ONUVote("v7", "yes"),
            new ONUVote("v8", "yes"),
            new ONUVote("v9", "yes"),

            new ONUVote("v10", "no"),
            new ONUVote("v11", "no"),
            new ONUVote("v12", "no"),
            new ONUVote("v13", "no"),
            new ONUVote("v14", "no"),
            new ONUVote("v15", "no"),
            new ONUVote("v16", "no"),
            new ONUVote("v17", "no"),
            new ONUVote("v18", "no"),
        ];

        expect(strategy.calculate(votes)).toBe(false);
    });


    test("It should fail when there are fewer than 9 'yes' votes, even if they constitute a majority.", () => {
        const strategy = new ONUCountingStrategy();

        const votes = [
            new ONUVote("v1", "yes"),
            new ONUVote("v2", "yes"),
            new ONUVote("v3", "yes"),
            new ONUVote("v4", "yes"),
            new ONUVote("v5", "yes"),
            new ONUVote("v6", "yes"),
            new ONUVote("v7", "yes"),
            new ONUVote("v8", "yes"),

            new ONUVote("v9", "no"),
            new ONUVote("v10", "no"),
            new ONUVote("v11", "abstention"),
        ];

        expect(strategy.calculate(votes)).toBe(false);
    });


    test("It should be rejected immediately when a permanent member votes 'no'", () => {
        const strategy = new ONUCountingStrategy();

        const votes = [
            new ONUVote("v1", "yes"),
            new ONUVote("v2", "yes"),
            new ONUVote("v3", "yes"),
            new ONUVote("v4", "yes"),
            new ONUVote("v5", "yes"),
            new ONUVote("v6", "yes"),
            new ONUVote("v7", "yes"),
            new ONUVote("v8", "yes"),
            new ONUVote("v9", "yes"),

            new ONUVote("v10", "no", true),
            new ONUVote("v11", "abstention"),
            new ONUVote("v12", "abstention"),
            new ONUVote("v13", "abstention"),
            new ONUVote("v14", "abstention"),
        ];

        expect(strategy.calculate(votes)).toBe(false);
    });


    test("The veto should prevail even when there is a majority of 'yes' votes", () => {
        const strategy = new ONUCountingStrategy();

        const votes = [
            new ONUVote("v1", "yes"),
            new ONUVote("v2", "yes"),
            new ONUVote("v3", "yes"),
            new ONUVote("v4", "yes"),
            new ONUVote("v5", "yes"),
            new ONUVote("v6", "yes"),
            new ONUVote("v7", "yes"),
            new ONUVote("v8", "yes"),
            new ONUVote("v9", "yes"),
            new ONUVote("v10", "yes"),
            new ONUVote("v11", "yes"),
            new ONUVote("v12", "no", true),
            new ONUVote("v13", "no"),
            new ONUVote("v14", "no"),
        ];

        expect(strategy.calculate(votes)).toBe(false);
    });


    test("A 'no' vote from a non-permanent member should not exercise veto power.", () => {
        const strategy = new ONUCountingStrategy();

        const votes = [
            new ONUVote("v1", "yes"),
            new ONUVote("v2", "yes"),
            new ONUVote("v3", "yes"),
            new ONUVote("v4", "yes"),
            new ONUVote("v5", "yes"),
            new ONUVote("v6", "yes"),
            new ONUVote("v7", "yes"),
            new ONUVote("v8", "yes"),
            new ONUVote("v9", "yes"),
            new ONUVote("v10", "yes"),

            new ONUVote("v11", "no", false),
        ];

        expect(strategy.calculate(votes)).toBe(true);
    });


    test("A permanent member voting 'yes' should normally be counted.", () => {
        const strategy = new ONUCountingStrategy();

        const votes = [
            new ONUVote("v1", "yes", true),
            new ONUVote("v2", "yes"),
            new ONUVote("v3", "yes"),
            new ONUVote("v4", "yes"),
            new ONUVote("v5", "yes"),
            new ONUVote("v6", "yes"),
            new ONUVote("v7", "yes"),
            new ONUVote("v8", "yes"),
            new ONUVote("v9", "yes"),

            new ONUVote("v10", "no"),
            new ONUVote("v11", "no"),
            new ONUVote("v12", "abstention"),
            new ONUVote("v13", "abstention"),
            new ONUVote("v14", "abstention"),
        ];

        expect(strategy.calculate(votes)).toBe(true);
    });

});

