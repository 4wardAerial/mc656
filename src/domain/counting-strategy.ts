import type { ICandidate, ICountingStrategy, ConclaveVote, ONUVote, CondominiumVote } from "./vote.js";

// -=-=-=-=-=-=-=-=-=- Specific Classes -=-=-=-=-=-=-=-=-=-

export class ONUCountingStrategy implements ICountingStrategy<ONUVote, boolean> {

    calculate(votes: ONUVote[]): boolean {
        
        const numberVoters = votes.length

        let yesCount = 0;

        if (votes.length === 0) {
            throw new Error("Number of Votes must not be 0")
        }

        for (const vote of votes) {
            if (vote.isPermanentMember && vote.value === 'no') {
                return false; 
            } else if (vote.value === 'yes') {
                yesCount++;
            }
        }

        if (yesCount < 9 || yesCount <= numberVoters / 2) {
            return false
        } 
        return true
    }
}

export class CondominiumCountingStrategy implements ICountingStrategy<CondominiumVote, boolean> {

    private firstCall : boolean;

    constructor() {
        this.firstCall = true;
    }

    calculate(votes: CondominiumVote[]): boolean {
        //We have the assumption that weights of the condominium votes is in the interval (0,1)

        let totalWeightAll = 0;
        let yesWeightAll = 0;

        if (votes.length === 0) {
            throw new Error("Number of Votes must not be 0")
        }
        
        for (const vote of votes) {
            if (vote.value === 'yes') {
                yesWeightAll += vote.weight;
            }

            totalWeightAll += vote.weight;
        }

        if (this.firstCall) {
            this.firstCall = false;

            return yesWeightAll > 0.5;

        } else {
            return yesWeightAll > totalWeightAll / 2;
        }
    }
}

export class ConclaveCountingStrategy implements ICountingStrategy<ConclaveVote> {
    
    private currentCall : number;
    private twoMostVoted : Array<string>;

    constructor() {
        this.currentCall = 0;
        this.twoMostVoted = ["", ""];
    }

    calculate(votes: ConclaveVote[]): boolean | ICandidate {
        const voteCount = new Map<string, number>();
        const idToObject = new Map<string, ICandidate>();
        let allVotes = 0;

        if (votes.length == 0) {
            throw new Error("Number of Votes must not be 0")
        }

        this.currentCall++;

        for (const vote of votes) {
            allVotes++;
            if (this.currentCall >= 3 && !this.twoMostVoted.includes(vote.value.candidateId)) {
                //Tolerance of 4 votings before the restriction of the candidates
                throw new Error("Voted candidate is not one of the two most voted of the last call");

            } else {
                const numberOfVotes = voteCount.get(vote.value.candidateId) ?? 0;
                voteCount.set(vote.value.candidateId, numberOfVotes + 1);
                idToObject.set(vote.value.candidateId, vote.value); 
            }
        }

        if (voteCount.size == 1) {
            //if this just one candidate recived votes, then he is the elected pope
            return idToObject.values().next().value!
        }

        const orderedCandidates = Array.from(voteCount.entries()).sort((a, b) => b[1] - a[1]); // decrescent sort
        this.twoMostVoted = [orderedCandidates[0]![0], orderedCandidates[1]![0]] // [most voted, second most voted]

        const mostVotedCandidateVotes = voteCount.get(this.twoMostVoted[0]!)

        if (mostVotedCandidateVotes! / allVotes >= 2/3) {
            return idToObject.get(this.twoMostVoted[0]!)!
        } else {
            return false
        }
    }
  
}