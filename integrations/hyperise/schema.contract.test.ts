import { expect, test } from 'bun:test';
import { z } from 'zod';
import { provider } from './src/index';

test('the legacy client account tool remains beside the documented organization tool', () => {
  let legacy = provider.actions.find(action => action.key === 'create_client_account');
  let replacement = provider.actions.find(
    action => action.key === 'create_client_organization'
  );
  expect(legacy?.type).toBe('tool');
  expect(legacy?.tags?.deprecated).toBe(true);
  expect(legacy?.description).toStartWith(
    'DEPRECATED — use `create_client_organization` instead.'
  );
  expect(replacement?.type).toBe('tool');
  let schema = z.toJSONSchema(legacy!.inputSchema);
  expect(schema.required).toEqual(['businessId', 'clientName', 'clientEmail']);
  expect(schema.properties?.businessId?.type).toBe('string');
});

test('registered tools have object inputs and valid production identifiers', () => {
  for (let action of provider.actions) {
    let schema = z.toJSONSchema(action.inputSchema);
    expect(schema.type).toBe('object');
    expect(schema.oneOf).toBeUndefined();
    expect(schema.anyOf).toBeUndefined();
    expect(schema.allOf).toBeUndefined();
    expect(`hyperise-${action.key}`.length).toBeLessThan(60);
  }
});
