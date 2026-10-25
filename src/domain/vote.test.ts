import { describe, it, expect } from 'vitest';
import { ConclaveVote, ONUVote, CondominiumVote } from './vote.js';
import { User } from './user.js';
import { SessionType } from './session-type.js';

describe('Vote Classes', () => {
  describe('ConclaveVote', () => {
    it('should create a valid ConclaveVote with string candidateName', () => {
      const user = User.voter('voter1', { sessionType: SessionType.CONCLAVE, attribute: null });
      const vote = new ConclaveVote(user, 'Candidate 1');
      expect(vote.voterId).toBe('voter1');
      expect(vote.candidateName).toBe('Candidate 1');
      expect(vote.value).toBe('Candidate 1');
    });

    it('should create a valid ConclaveVote with ICandidate object', () => {
      const user = User.voter('voter1', { sessionType: SessionType.CONCLAVE, attribute: null });
      const vote = new ConclaveVote(user, { candidateId: 'c1', name: 'Candidate 1' });
      expect(vote.voterId).toBe('voter1');
      expect(vote.candidateName).toBe('Candidate 1');
    });

    it('should fallback to candidateId when ICandidate name is omitted', () => {
      const user = User.voter('voter1', { sessionType: SessionType.CONCLAVE, attribute: null });
      const vote = new ConclaveVote(user, { candidateId: 'c1' });
      expect(vote.voterId).toBe('voter1');
      expect(vote.candidateName).toBe('c1');
    });

    it('should throw error if user or voterId is missing', () => {
      // @ts-expect-error Forcing error to test validation
      expect(() => new ConclaveVote(null, 'Candidate 1')).toThrow('voterId is required');
      // @ts-expect-error Forcing error to test validation
      expect(() => new ConclaveVote({}, 'Candidate 1')).toThrow('voterId is required');
    });

    it('should throw error if candidateName is empty', () => {
      const user = User.voter('voter1', { sessionType: SessionType.CONCLAVE, attribute: null });
      expect(() => new ConclaveVote(user, '')).toThrow('candidateName is required');
    });

    it('should guarantee immutability (readonly)', () => {
      const user = User.voter('voter1', { sessionType: SessionType.CONCLAVE, attribute: null });
      const vote = new ConclaveVote(user, 'Candidate 1');
      // @ts-expect-error Forcing error to ensure readonly modifier works
      vote.voterId = 'voter2';
    });
  });

  describe('ONUVote', () => {
    it('should create a valid ONUVote', () => {
      const user = User.voter('voter2', { sessionType: SessionType.ONU, attribute: true });
      const vote = new ONUVote(user, 'yes', true);
      expect(vote.voterId).toBe('voter2');
      expect(vote.value).toBe('yes');
      expect(vote.isPermanentMember).toBe(true);
    });

    it('should default isPermanentMember to false when omitted', () => {
      const user = User.voter('voter2', { sessionType: SessionType.ONU, attribute: false });
      const vote = new ONUVote(user, 'no');
      expect(vote.voterId).toBe('voter2');
      expect(vote.value).toBe('no');
      expect(vote.isPermanentMember).toBe(false);
    });

    it('should throw error if user or voterId is missing', () => {
      // @ts-expect-error Forcing error to test validation
      expect(() => new ONUVote(null, 'no')).toThrow('voterId is required');
    });
  });

  describe('CondominiumVote', () => {
    it('should create a valid CondominiumVote', () => {
      const user = User.voter('voter3', { sessionType: SessionType.CONDOMINIUM, attribute: 10 });
      const vote = new CondominiumVote(user, 10, 'abstention');
      expect(vote.voterId).toBe('voter3');
      expect(vote.weight).toBe(10);
      expect(vote.value).toBe('abstention');
    });

    it('should throw error if user or voterId is missing', () => {
      // @ts-expect-error Forcing error to test validation
      expect(() => new CondominiumVote(null, 10, 'yes')).toThrow('voterId is required');
    });

    it('should throw error if weight is zero or negative', () => {
      const user = User.voter('voter3', { sessionType: SessionType.CONDOMINIUM, attribute: 10 });
      expect(() => new CondominiumVote(user, 0, 'yes')).toThrow('weight must be greater than zero');
      expect(() => new CondominiumVote(user, -5, 'yes')).toThrow('weight must be greater than zero');
    });
  });
});