import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import legacy from './legacy-contracts.json';

describeMcpCompatibleToolSchemas('LinkedIn Ads input schemas', provider.actions);

type Schema =
  | boolean
  | {
      description?: string;
      type?: unknown;
      properties?: Record<string, Schema>;
      items?: Schema | Schema[];
      required?: string[];
      enum?: unknown[];
      default?: unknown;
      anyOf?: Schema[];
    };
const preserves = (current: Schema, previous: Schema, input: boolean) => {
  if (typeof previous === 'boolean' || typeof current === 'boolean') {
    expect(current).toEqual(previous);
    return;
  }
  expect(current.type).toEqual(previous.type);
  expect(current.default).toEqual(previous.default);
  if (previous.enum) expect(current.enum).toEqual(expect.arrayContaining(previous.enum));
  if (input)
    expect(previous.required ?? []).toEqual(expect.arrayContaining(current.required ?? []));
  else expect(current.required ?? []).toEqual(expect.arrayContaining(previous.required ?? []));
  for (const [field, schema] of Object.entries(previous.properties ?? {})) {
    const next = current.properties?.[field];
    expect(next, `Preserved field ${field}`).toBeDefined();
    preserves(next!, schema, input);
  }
  if (Array.isArray(previous.items)) {
    expect(Array.isArray(current.items)).toBe(true);
    previous.items.forEach((item, index) => {
      if (!Array.isArray(current.items)) throw new Error('Tuple schema is missing.');
      preserves(current.items[index]!, item, input);
    });
  } else if (previous.items) {
    if (Array.isArray(current.items)) throw new Error('Array item schema changed.');
    preserves(current.items!, previous.items, input);
  }
  if (previous.anyOf) {
    expect(current.anyOf).toHaveLength(previous.anyOf.length);
    previous.anyOf.forEach((value, index) => preserves(current.anyOf![index]!, value, input));
  }
};
describe('LinkedIn Ads legacy schema contracts', () => {
  for (const [key, contract] of Object.entries(legacy)) {
    it(`preserves ${key} fields, types, defaults and requiredness`, () => {
      const action = provider.actions.find(
        action => action.type === 'tool' && action.key === key
      );
      if (!action || action.type !== 'tool') throw new Error('Legacy action is missing.');
      preserves(
        action.inputSchema.toJSONSchema({ unrepresentable: 'any' }),
        contract.input,
        true
      );
      preserves(
        action.outputSchema.toJSONSchema({ unrepresentable: 'any' }),
        contract.output,
        false
      );
    });
  }
  it('preserves eighteen actions, adds only three reads, and keeps short IDs', () => {
    const tools = provider.actions.filter(action => action.type === 'tool');
    expect(Object.keys(legacy)).toHaveLength(18);
    expect(tools).toHaveLength(21);
    expect(tools.map(tool => tool.key)).toEqual(
      expect.arrayContaining(['get_current_user', 'get_campaign_group', 'get_creative'])
    );
    expect(provider.actions.filter(action => action.type !== 'tool')).toHaveLength(0);
    for (const tool of tools) expect(`linkedin-ads-${tool.key}`.length).toBeLessThan(60);
  });
  it('adds exact lead IDs while preserving required legacy numeric IDs', () => {
    const tool = provider.actions.find(action => action.key === 'list_lead_forms');
    if (!tool || tool.type !== 'tool') throw new Error('Lead discovery is missing.');
    const schema = tool.outputSchema.toJSONSchema({ unrepresentable: 'any' }) as Exclude<
      Schema,
      boolean
    >;
    expect(schema.required).toContain('leadForms');
    const legacyForms = schema.properties!.leadForms as Exclude<Schema, boolean>;
    const legacyItem = legacyForms.items as Exclude<Schema, boolean>;
    expect(legacyItem.required).toContain('leadFormId');
    expect(legacyItem.properties!.leadFormId).toMatchObject({ type: 'number' });
    const exactForms = schema.properties!.exactLeadForms as Exclude<Schema, boolean>;
    const exactItem = exactForms.items as Exclude<Schema, boolean>;
    expect(exactItem.properties!.leadFormId).toMatchObject({ type: 'string' });
    expect(schema.properties!.legacyNumericIdOmissionCount).toMatchObject({ type: 'number' });
    expect(() =>
      tool.outputSchema.parse({
        leadForms: [{ leadFormId: 6, name: 'Small', status: 'PUBLISHED' }],
        exactLeadForms: [
          {
            leadFormId: '6755260984438374401',
            versionId: 1,
            owner: 'urn:li:sponsoredAccount:1',
            name: 'Large',
            status: 'PUBLISHED'
          }
        ],
        legacyNumericIdOmissionCount: 1
      })
    ).not.toThrow();
  });
});
