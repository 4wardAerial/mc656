import type { User } from "./user";

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
  public readonly voterId: string;
  public readonly candidateName: string;
  public readonly value: string;

  constructor(user: User, candidate: string | ICandidate) {
    if (!user || !user.id) {
      throw new Error("voterId is required");
    }
    this.voterId = user.id

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
  public readonly voterId: string;

  constructor(
    user: User,
    public readonly value: 'yes' | 'no' | 'abstention',
    public readonly isPermanentMember: boolean = false
  ) {
    if (!user || !user.id) {
      throw new Error("voterId is required");
    }
    this.voterId = user.id;
  }
}

export class CondominiumVote implements IVote {
  public readonly voterId: string;

  constructor(
    user: User,
    public readonly weight: number,
    public readonly value: 'yes' | 'no' | 'abstention'
  ) {
    if (!user || !user.id) {
      throw new Error("voterId is required");
    }
    if (weight == null || weight <= 0) {
      throw new Error("weight must be greater than zero");
    }
    this.voterId = user.id;
  }
}
