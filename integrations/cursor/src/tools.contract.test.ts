import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { getSpend, getTeamMembers, getTeamSpending, listTeamMembers } from './tools';

describeMcpCompatibleToolSchemas('Cursor tool input schemas', provider.actions);

describe('Cursor numeric-ID compatibility tools', () => {
  it.each([
    [getTeamMembers, listTeamMembers, 'get_team_members', 'list_team_members'],
    [getSpend, getTeamSpending, 'get_team_spend', 'get_team_spending']
  ] as const)('retains %s and its current replacement', (legacy, current, legacyKey, currentKey) => {
    expect(legacy.key).toBe(legacyKey);
    expect(current.key).toBe(currentKey);
    expect(provider.actions).toContain(legacy);
    expect(provider.actions).toContain(current);
    expect(legacy.tags).toMatchObject({ deprecated: true, readOnly: true });
    expect(legacy.description?.startsWith(`DEPRECATED — use \`${currentKey}\` instead.`)).toBe(
      true
    );
    expect(legacy.instructions?.join(' ')).toContain(currentKey);
  });
});
