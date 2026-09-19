// -=-=-=-=-=-=-=-=-=- Temp Agreed Interfaces -=-=-=-=-=-=-=-=-=-

export interface ICandidate {
  candidateId: string;
  name?: string;
}

export interface IVote {
  voterId: string;
  weight?: number;
}

export interface ICountingStrategy<TVote extends IVote = IVote, TResult = boolean | ICandidate> {
  calculate(votes: TVote[]): TResult;
}

export class ConclaveVote implements IVote {
  constructor(
    public readonly voterId: string,
    public readonly value: ICandidate
  ) {
    if (!voterId) {
      throw new Error("voterId is required");
    }
  }
}

export class ONUVote implements IVote {
  constructor(
    public readonly voterId: string,
    public readonly value: 'yes' | 'no' | 'abstention',
    public readonly isPermanentMember: boolean = false
  ) {
    if (!voterId) {
      throw new Error("voterId is required");
    }
  }
}

export class CondominiumVote implements IVote {
  constructor(
    public readonly voterId: string,
    public readonly weight: number,
    public readonly value: 'yes' | 'no' | 'abstention'
  ) {
    if (!voterId) {
      throw new Error("voterId is required");
    }
    if (weight == null || weight <= 0) {
      throw new Error("weight must be greater than zero");
    }
  }
}


// -=-=-=-=-=-=-=-=-=- Specific Classes -=-=-=-=-=-=-=-=-=-

export class ONUCountingStrategy implements ICountingStrategy<ONUVote> {

    calculate(votes: ONUVote[]): boolean | ICandidate {
        
        let numberVoters = votes.length

        let yesCount = 0;

        for (const vote of votes) {
            if (vote.isPermanentMember && vote.value === 'no') {
                return false; 
            } else if (vote.value == 'yes') {
                yesCount++;
            }
        }

        if (yesCount < 9 || yesCount <= numberVoters / 2) {
            return false
        } 
        return true
    }
}

export class CondominiumCountingStrategy implements ICountingStrategy<CondominiumVote> {

    private firstCall : boolean;

    constructor() {
        this.firstCall = true;
    }

    calculate(votes: CondominiumVote[]): boolean | ICandidate {
        //We have the assumption that weights of the condominium votes is in the interval (0,1)

        let totalWeightAll = 0;
        let yesWeightAll = 0;
        
        for (const vote of votes) {
            if (vote.value == 'yes') {
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
