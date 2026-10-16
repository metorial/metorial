import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { z } from 'zod';
import { provider } from './index';

describe('Reference data migration contract', () => {
  test('retains the legacy tool and registers its language replacement', () => {
    let tools = provider.actions.filter(action => action.type === 'tool');
    let legacy = tools.find(action => action.key === 'list_reference_data');
    assert(legacy);
    assert.equal(legacy.tags?.deprecated, true);
    assert(legacy.description?.startsWith('DEPRECATED — use `list_languages` instead.'));
    let replacement = tools.find(action => action.key === 'list_languages');
    assert(replacement);
    assert.deepEqual(z.toJSONSchema(legacy.inputSchema), z.toJSONSchema(z.object({})));
    assert.deepEqual(z.toJSONSchema(legacy.outputSchema).required, ['languages', 'countries']);
    assert(
      legacy.outputSchema.safeParse({
        languages: [{ languageCode: 'en', languageName: 'English' }],
        countries: [{ countryCode: 'gb', countryName: 'United Kingdom' }]
      }).success
    );
    assert(!legacy.outputSchema.safeParse({ languages: ['English'], countries: [] }).success);
    assert(replacement.outputSchema.safeParse({ languages: ['English'] }).success);
  });
});
