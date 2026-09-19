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


// -=-=-=-=-=-=-=-=-=- Specific Vote Classes -=-=-=-=-=-=-=-=-=-

export class ONUContingStrategy implements ICountingStrategy<ONUVote> {

    calculate(votes: ONUVote[]): boolean | ICandidate {
        
        let numberVoters = votes.length
        
        if (numberVoters < 0) {
            throw new Error(`Expected a greater than zero number, got ${numberVoters}`);
        }

        let yesCount = 0;

        for (const vote of votes) {
            if (vote.isPermanentMember && vote.value === 'no') {
                return false; 
            } else if (vote.value == 'yes') {
                yesCount += 1
            }
        }

        if (yesCount < 9 || yesCount <= numberVoters / 2) {
            return false
        } 
        return true
    }
}
