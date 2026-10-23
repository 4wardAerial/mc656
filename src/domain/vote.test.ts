import { describe, it, expect } from 'vitest';
import { ConclaveVote, ONUVote, CondominiumVote, validateNoDuplicateVote, type IVote } from './vote.js';

describe('Vote Classes', () => {
  describe('ConclaveVote', () => {
    it('should create a valid ConclaveVote with string candidateName', () => {
      const vote = new ConclaveVote('voter1', 'Candidate 1');
      expect(vote.voterId).toBe('voter1');
      expect(vote.candidateName).toBe('Candidate 1');
      expect(vote.value).toBe('Candidate 1');
    });

    it('should create a valid ConclaveVote with ICandidate object', () => {
      const vote = new ConclaveVote('voter1', { candidateId: 'c1', name: 'Candidate 1' });
      expect(vote.voterId).toBe('voter1');
      expect(vote.candidateName).toBe('Candidate 1');
    });

    it('should fallback to candidateId when ICandidate name is omitted', () => {
      const vote = new ConclaveVote('voter1', { candidateId: 'c1' });
      expect(vote.voterId).toBe('voter1');
      expect(vote.candidateName).toBe('c1');
    });

    it('should throw error if voterId is missing', () => {
      expect(() => new ConclaveVote('', 'Candidate 1')).toThrow('voterId is required');
    });

    it('should throw error if candidateName is empty', () => {
      expect(() => new ConclaveVote('voter1', '')).toThrow('candidateName is required');
    });

    it('should guarantee immutability (readonly)', () => {
      const vote = new ConclaveVote('voter1', 'Candidate 1');
      // @ts-expect-error Forcing error to ensure readonly modifier works
      vote.voterId = 'voter2';
    });
  });

  describe('ONUVote', () => {
    it('should create a valid ONUVote', () => {
      const vote = new ONUVote('voter2', 'yes', true);
      expect(vote.voterId).toBe('voter2');
      expect(vote.value).toBe('yes');
      expect(vote.isPermanentMember).toBe(true);
    });

    it('should throw error if voterId is missing', () => {
      expect(() => new ONUVote('', 'no')).toThrow('voterId is required');
    });
  });

  describe('CondominiumVote', () => {
    it('should create a valid CondominiumVote', () => {
      const vote = new CondominiumVote('voter3', 10, 'abstention');
      expect(vote.voterId).toBe('voter3');
      expect(vote.weight).toBe(10);
      expect(vote.value).toBe('abstention');
    });

    it('should throw error if voterId is missing', () => {
      expect(() => new CondominiumVote('', 10, 'yes')).toThrow('voterId is required');
    });

    it('should throw error if weight is zero or negative', () => {
      expect(() => new CondominiumVote('voter3', 0, 'yes')).toThrow('weight must be greater than zero');
      expect(() => new CondominiumVote('voter3', -5, 'yes')).toThrow('weight must be greater than zero');
    });
  });

  describe('validateNoDuplicateVote', () => {
    it('should not throw error if voterId does not exist in the list', () => {
      const votes: IVote[] = [
        new ConclaveVote('voter1', 'c1'),
        new ONUVote('voter2', 'no')
      ];
      expect(() => validateNoDuplicateVote(votes, 'voter3')).not.toThrow();
    });

    it('should throw error if duplicate vote is detected', () => {
      const votes: IVote[] = [
        new ConclaveVote('voter1', 'c1'),
        new CondominiumVote('voter2', 5, 'yes'),
        new ONUVote('voter3', 'no')
      ];
      expect(() => validateNoDuplicateVote(votes, 'voter1')).toThrow('Duplicate vote for voterId: voter1');
    });
  });
});
