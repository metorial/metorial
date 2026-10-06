import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';

describeMcpCompatibleToolSchemas('Contentful GraphQL input schemas', provider.actions);
let tools = provider.actions.filter(action => action.type === 'tool');
let withoutHelp = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutHelp);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !['description', '$schema'].includes(key))
        .map(([key, item]) => [key, withoutHelp(item)])
    );
  return value;
};
for (let [key, before] of Object.entries(legacy)) {
  it(`${key} preserves its public name and every original input/output field contract`, () => {
    let tool = tools.find(tool => tool.key === key);
    expect(tool?.name).toBe(before.name);
    for (let direction of ['input', 'output'] as const) {
      let original: { properties: Record<string, unknown>; required?: string[] } =
        before[direction];
      let current = z.toJSONSchema(
        direction === 'input' ? tool!.inputSchema : tool!.outputSchema
      ) as { properties?: Record<string, unknown>; required?: string[] };
      for (let [name, schema] of Object.entries(original.properties)) {
        let now = current.properties?.[name];
        // Nested optional response additions are compatible; existing properties/types remain.
        let assertPreserved = (original: unknown, next: unknown): void => {
          if (!original || typeof original !== 'object' || Array.isArray(original)) {
            expect(withoutHelp(next)).toEqual(withoutHelp(original));
            return;
          }
          for (let [field, value] of Object.entries(original)) {
            if (['description', '$schema'].includes(field)) continue;
            if (field === 'properties') {
              for (let [property, child] of Object.entries(value as Record<string, unknown>))
                assertPreserved(
                  child,
                  (next as { properties?: Record<string, unknown> })?.properties?.[property]
                );
            } else if (field === 'required') {
              expect((next as { required?: string[] }).required ?? []).toEqual(value);
            } else if (value && typeof value === 'object' && !Array.isArray(value))
              assertPreserved(value, (next as Record<string, unknown>)?.[field]);
            else
              expect(withoutHelp((next as Record<string, unknown>)?.[field])).toEqual(
                withoutHelp(value)
              );
          }
        };
        assertPreserved(schema, now);
      }
      expect((current.required ?? []).filter(name => name in original.properties)).toEqual(
        original.required ?? []
      );
    }
  });
}
it('registers exactly the five approved tools and no triggers', () => {
  expect(tools.map(tool => tool.key).sort()).toEqual([
    'introspect_schema',
    'list_content_types',
    'list_spaces',
    'preview_content',
    'query_content'
  ]);
  expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
  expect(tools.every(tool => `contentful-graphql-${tool.key}`.length < 60)).toBe(true);
});
