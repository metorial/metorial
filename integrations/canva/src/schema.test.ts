import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';

const tools = provider.actions.filter(action => action.type === 'tool');
describeMcpCompatibleToolSchemas('Canva object input schemas', tools);
function preserve(before: unknown, after: unknown, path: string): void {
  if (!before || typeof before !== 'object' || Array.isArray(before)) {
    expect(after).toEqual(before);
    return;
  }
  const now = after as Record<string, unknown>;
  for (const [field, value] of Object.entries(before)) {
    if (['description', '$schema'].includes(field)) continue;
    if (field === 'properties') {
      for (const [name, schema] of Object.entries(value as Record<string, unknown>))
        preserve(
          schema,
          (now.properties as Record<string, unknown>)?.[name],
          `${path}.${name}`
        );
    } else if (field === 'required') {
      const expected = value as string[];
      const retained = path.endsWith('.image')
        ? expected.filter(name => !['ownerUserId', 'ownerTeamId'].includes(name))
        : expected;
      expect(
        ((now.required as string[]) ?? []).filter(name => expected.includes(name))
      ).toEqual(retained);
    } else if (value && typeof value === 'object' && !Array.isArray(value))
      preserve(value, now[field], `${path}.${field}`);
    else expect(now[field]).toEqual(value);
  }
}
for (const [key, before] of Object.entries(legacy))
  it(`${key} preserves its original key, name and field contracts`, () => {
    const tool = tools.find(tool => tool.key === key);
    if (!tool) throw new Error(`Missing original contract ${key}`);
    expect(tool.name).toBe(before.name);
    preserve(before.input, z.toJSONSchema(tool.inputSchema), `${key}.input`);
    preserve(before.output, z.toJSONSchema(tool.outputSchema), `${key}.output`);
  });
it('registers only the approved25 public tools, with short IDs and no triggers', () => {
  expect(tools.map(tool => tool.key).sort()).toEqual(
    [...Object.keys(legacy), 'get_asset_upload_job', 'get_autofill_job'].sort()
  );
  expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
  expect(tools.every(tool => `canva-${tool.key}`.length < 60)).toBe(true);
});
