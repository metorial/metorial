import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { spec } from './spec';

describe('destatis provider contract', () => {
  it('exposes the Destatis specification without actions', () => {
    expect(spec.key).toBe('destatis');
    expect(spec.name).toBe('Destatis GENESIS-Online');
    expect(provider.actions).toEqual([]);
  });
});
