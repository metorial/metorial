import { describe, expect, it } from 'vitest';
import { provider } from './index';

describe('Logo.dev retired Describe contract', () => {
  it('registers both the deprecated tool and its replacement', () => {
    let legacy = provider.actions.find(action => action.key === 'describe_brand');
    let replacement = provider.actions.find(action => action.key === 'lookup_brand');
    expect(legacy).toBeDefined();
    expect(replacement).toBeDefined();
    expect(legacy?.tags?.deprecated).toBe(true);
    expect(legacy?.description).toMatch(/^DEPRECATED — use `lookup_brand` instead\./);
    expect(
      legacy?.instructions?.some(instruction => instruction.includes('lookup_brand'))
    ).toBe(true);
  });
});
