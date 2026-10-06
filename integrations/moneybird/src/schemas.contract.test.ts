import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import baseline from './legacy-schemas.json';

type Schema = Record<string, unknown>;
const row = (value: unknown): Schema => value as Schema;
const preserved = (old: Schema, current: Schema, path: string) => {
  for (const key of [
    'type',
    'const',
    'default',
    'minimum',
    'maximum',
    'minLength',
    'maxLength',
    'minItems',
    'maxItems'
  ]) {
    if (!(key in old)) continue;
    if (
      key === 'type' &&
      old[key] === 'boolean' &&
      (/manage_recurring_invoices\.output.*\.(active|autoSend)$/.test(path) ||
        path === 'get_contact.output.sepaActive')
    ) {
      expect(current.anyOf, `${path} documents nullable flags`).toEqual([
        { type: 'boolean' },
        { type: 'null' }
      ]);
    } else expect(current[key], `${path}.${key}`).toEqual(old[key]);
  }
  if (Array.isArray(old.enum))
    for (const value of old.enum) expect(current.enum, `${path}.enum`).toContain(value);
  if (old.properties)
    for (const [field, value] of Object.entries(row(old.properties))) {
      expect(row(current.properties), `${path}.${field}`).toHaveProperty(field);
      preserved(row(value), row(row(current.properties)[field]), `${path}.${field}`);
    }
  if (old.items) preserved(row(old.items), row(current.items), `${path}.items`);
  if (Array.isArray(old.anyOf))
    old.anyOf.forEach((value, index) =>
      preserved(row(value), row((current.anyOf as unknown[])[index]), `${path}.anyOf.${index}`)
    );
  if (Array.isArray(old.required) && Array.isArray(current.required))
    for (const field of current.required) {
      if (path.includes('.input'))
        expect(old.required, `${path} no newly required fields`).toContain(field);
    }
};
describeMcpCompatibleToolSchemas('Moneybird tool input schemas', provider.actions);
describe('Moneybird legacy contracts', () => {
  for (const [key, schemas] of Object.entries(baseline))
    it(`preserves ${key} fields, types and enum values`, () => {
      const action = provider.actions.find(value => value.key === key);
      expect(action).toBeDefined();
      if (!action) throw new Error('Missing legacy action.');
      preserved(
        schemas.input,
        z.toJSONSchema(action.inputSchema as z.ZodType, { io: 'input' }),
        `${key}.input`
      );
      preserved(
        schemas.output,
        z.toJSONSchema(action.outputSchema as z.ZodType),
        `${key}.output`
      );
    });
  it('registers 21 public tools and only the reserved renewal helper', () => {
    const keys = provider.actions.map(action => action.key);
    expect(keys).toHaveLength(22);
    expect(new Set(keys).size).toBe(22);
    expect(keys).toContain('list_administrations');
    expect(keys).toContain('download_sales_invoice');
    expect(keys).toContain('metorial$getFileUrl');
  });
  it('keeps public production IDs under 60 characters', () => {
    for (const action of provider.actions)
      expect(`moneybird-${action.key}`.length).toBeLessThan(60);
  });
  it('has no legacy triggers', () => {
    expect(provider.actions.filter(action => action.type !== 'tool')).toHaveLength(0);
    expect(provider.triggerGroups).toHaveLength(0);
  });
});
