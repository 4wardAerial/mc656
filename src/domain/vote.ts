export interface ICandidate {
  candidateId: string;
  name?: string;
}

export interface IVote {
  readonly voterId: string;
  readonly weight?: number;
}

export interface ICountingStrategy<TVote extends IVote = IVote, TResult = boolean | ICandidate> {
  calculate(votes: TVote[]): TResult;
}

// -=-=-=-=-=-=-=-=-=- Specific Vote Classes -=-=-=-=-=-=-=-=-=-
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

export function validateNoDuplicateVote(votes: IVote[], voterId: string): void {
  const isDuplicate = votes.some(vote => vote.voterId === voterId);
  if (isDuplicate) {
    throw new Error(`Duplicate vote for voterId: ${voterId}`);
  }
}
