import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { legacyInputs } from './legacy-inputs.contract';

describeMcpCompatibleToolSchemas('Gusto tool inputs', provider.actions);

describe('Gusto legacy schema compatibility', () => {
  for (const [key, legacy] of Object.entries(legacyInputs)) {
    it(`preserves ${key} and its legacy fields`, () => {
      const tool = provider.actions.find(action => action.key === key);
      expect(tool).toBeDefined();
      const before = z.toJSONSchema(legacy, { io: 'input' });
      const after = z.toJSONSchema(tool!.inputSchema, { io: 'input' });
      expect(after.type).toBe('object');
      expect(after.required ?? []).toEqual(before.required ?? []);
      for (const [field, old] of Object.entries(before.properties ?? {})) {
        const current = after.properties?.[field];
        expect(current).toBeDefined();
        if (
          typeof old === 'object' &&
          old !== null &&
          typeof current === 'object' &&
          current !== null
        ) {
          expect(current.type).toEqual(old.type);
          if (old.enum) expect(current.enum).toEqual(expect.arrayContaining(old.enum));
          if (old.items) expect(current.items).toEqual(old.items);
        }
      }
    });
  }
  it('registers exactly the approved 20 public tools and no legacy triggers', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [...Object.keys(legacyInputs), 'get_current_context'].sort()
    );
    expect(provider.actions.every(action => `gusto-${action.key}`.length < 60)).toBe(true);
    expect(provider.triggerGroups).toEqual([]);
    expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
  });
});
