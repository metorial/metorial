import { describe, expect, test } from 'vitest';
import { createContact } from './contacts';

let createContactInputSchema = (
  createContact as unknown as {
    _inputSchema: { safeParse: (value: unknown) => { success: boolean } };
  }
)._inputSchema;

describe('createContact input schema', () => {
  let baseInput = {
    companySlug: 'demo-company',
    name: 'Test Contact'
  };

  test('accepts documented uppercase ISO 4217 currency codes', () => {
    expect(
      createContactInputSchema.safeParse({
        ...baseInput,
        currency: 'NOK'
      }).success
    ).toBe(true);
  });

  test('rejects currency codes outside the documented uppercase ISO 4217 pattern', () => {
    expect(
      createContactInputSchema.safeParse({
        ...baseInput,
        currency: 'nok'
      }).success
    ).toBe(false);

    expect(
      createContactInputSchema.safeParse({
        ...baseInput,
        currency: 'N0K'
      }).success
    ).toBe(false);
  });
});
