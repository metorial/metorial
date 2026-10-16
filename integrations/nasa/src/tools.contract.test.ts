import { expect, test } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

test('retains the legacy close-approach contract and registers its nullable replacement', () => {
  let legacy = provider.actions.find(action => action.key === 'get_close_approaches');
  let replacement = provider.actions.find(action => action.key === 'query_close_approaches');
  expect(legacy?.tags).toMatchObject({ readOnly: true, deprecated: true });
  expect(
    legacy?.description?.startsWith('DEPRECATED — use query_close_approaches instead.')
  ).toBe(true);
  expect(replacement).toBeDefined();
  expect(z.toJSONSchema(legacy!.outputSchema).properties?.data).toMatchObject({
    type: 'array',
    items: { type: 'array', items: { type: 'string' } }
  });
  expect(z.toJSONSchema(replacement!.outputSchema).properties?.data).toMatchObject({
    type: 'array',
    items: { type: 'array', items: { anyOf: [{ type: 'string' }, { type: 'null' }] } }
  });
});

test('retains the legacy APOD media contract alongside the current article-aware replacement', () => {
  let legacy = provider.actions.find(action => action.key === 'get_apod');
  let replacement = provider.actions.find(action => action.key === 'get_apod_entries');
  expect(legacy?.tags).toMatchObject({ readOnly: true, deprecated: true });
  expect(legacy?.description?.startsWith('DEPRECATED — use get_apod_entries instead.')).toBe(
    true
  );
  expect(replacement).toBeDefined();
  let legacyOutput = z.toJSONSchema(legacy!.outputSchema);
  let replacementOutput = z.toJSONSchema(replacement!.outputSchema);
  expect(legacyOutput.properties?.entries).toMatchObject({
    type: 'array',
    items: {
      properties: { url: { type: 'string' } },
      required: expect.arrayContaining(['url'])
    }
  });
  expect(replacementOutput.properties?.entries).toMatchObject({
    type: 'array',
    items: {
      properties: { articleUrl: { type: 'string' }, mediaUrl: { type: 'string' } },
      required: expect.arrayContaining(['articleUrl'])
    }
  });
});
