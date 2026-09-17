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
  ) { }
}

export class ONUVote implements IVote {
  constructor(
    public readonly voterId: string,
    public readonly value: 'yes' | 'no' | 'abstention',
    public readonly isPermanentMember: boolean = false
  ) { }
}

export class CondominiumVote implements IVote {
  constructor(
    public readonly voterId: string,
    public readonly weight: number,
    public readonly value: 'yes' | 'no' | 'abstention'
  ) { }
}