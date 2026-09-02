import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { spec } from './spec';

describe('destatis provider contract', () => {
  it('registers only catalog search at this stage', () => {
    expect(spec.key).toBe('destatis');
    expect(spec.name).toBe('Destatis GENESIS-Online');
    expect(provider.actions.map(action => action.key)).toEqual(['search_catalog']);
  });
});
