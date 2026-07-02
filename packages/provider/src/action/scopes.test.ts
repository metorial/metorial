import { describe, expect, it } from 'vitest';
import { allOf, anyOf, mergeScopes, scopeClause, validateScopes } from './scopes';

describe('action scope helpers', () => {
  it('builds OR and AND scope clauses', () => {
    expect(scopeClause('scope:read', 'scope:admin')).toEqual({
      OR: ['scope:read', 'scope:admin']
    });

    expect(anyOf('scope:read', 'scope:admin')).toEqual({
      AND: [{ OR: ['scope:read', 'scope:admin'] }]
    });

    expect(allOf(['scope:calendar'], ['scope:sharing', 'scope:sharing:admin'])).toEqual({
      AND: [{ OR: ['scope:calendar'] }, { OR: ['scope:sharing', 'scope:sharing:admin'] }]
    });
  });

  it('accepts nested scope structures and flattens them', () => {
    expect(
      allOf(
        anyOf('scope:events.read', 'scope:events.write'),
        scopeClause('scope:calendar'),
        'scope:profile'
      )
    ).toEqual({
      AND: [
        { OR: ['scope:events.read', 'scope:events.write'] },
        { OR: ['scope:calendar'] },
        { OR: ['scope:profile'] }
      ]
    });
  });

  it('merges multiple scope sets and skips empty inputs', () => {
    expect(
      mergeScopes(
        anyOf('scope:calendar'),
        undefined,
        false,
        allOf(['scope:events.read', 'scope:events.write'], 'scope:profile')
      )
    ).toEqual({
      AND: [
        { OR: ['scope:calendar'] },
        { OR: ['scope:events.read', 'scope:events.write'] },
        { OR: ['scope:profile'] }
      ]
    });

    expect(mergeScopes(undefined, false, null)).toBeUndefined();
  });

  it('validates and clones incoming scope objects', () => {
    let input = {
      AND: [{ OR: ['scope:calendar', 'scope:calendar:admin'] }]
    };
    let validated = validateScopes(input);

    expect(validated).toEqual({
      AND: [{ OR: ['scope:calendar', 'scope:calendar:admin'] }]
    });
    expect(validated).not.toBe(input);
    expect(validated.AND[0]).not.toBe(input.AND[0]);
  });

  it('throws helpful errors for invalid scope definitions', () => {
    expect(() => scopeClause()).toThrow(
      'Each action scope clause must include at least one OR scope'
    );
    expect(() => scopeClause('')).toThrow('Action scopes must be non-empty strings');
    expect(() => validateScopes({ AND: [] })).toThrow(
      'Action scopes must include at least one AND clause'
    );
  });
});
