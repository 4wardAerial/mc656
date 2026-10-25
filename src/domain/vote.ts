export interface ICandidate {
  candidateId: string;
  name?: string;
}

export interface IVote {
  readonly voterId: string;
  readonly weight?: number;
}

// -=-=-=-=-=-=-=-=-=- Specific Vote Classes -=-=-=-=-=-=-=-=-=-
export class ConclaveVote implements IVote {
  public readonly candidateName: string;
  public readonly value: string;

  constructor(
    public readonly voterId: string,
    candidate: string | ICandidate
  ) {
    if (!voterId) {
      throw new Error("voterId is required");
    }
    const resolvedName = typeof candidate === "string"
      ? candidate
      : (candidate?.name ?? candidate?.candidateId ?? "");
    if (!resolvedName) {
      throw new Error("candidateName is required");
    }
    this.candidateName = resolvedName;
    this.value = resolvedName;
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
    this.voterId = user.id;
  }
}
