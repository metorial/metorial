import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { spec } from './spec';

describe('destatis provider contract', () => {
  it('registers discovery tools in workflow order', () => {
    expect(spec.key).toBe('destatis');
    expect(spec.name).toBe('Destatis GENESIS-Online');
    expect(provider.actions.map(action => action.key)).toEqual([
      'search_catalog',
      'get_metadata',
      'list_variable_values'
    ]);
  });
});
