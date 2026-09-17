import { describe, it, expect } from 'vitest';

describe('intentional failure test', () => {
  it('should fail on purpose', () => {
    expect(1).toBe(2);
  });
});