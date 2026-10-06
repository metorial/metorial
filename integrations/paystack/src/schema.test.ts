import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import legacy from './legacy-contracts.json';

describeMcpCompatibleToolSchemas('Paystack tool input schemas', provider.actions);
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
const permittedOmission = (key: string, field: string) =>
  /Id$/.test(field) ||
  ['totalCount', 'currentPage', 'totalPages'].includes(field) ||
  (['verify_transaction', 'list_transactions'].includes(key) && field === 'channel') ||
  (['verify_transaction', 'charge_authorization'].includes(key) &&
    field === 'gatewayResponse') ||
  (['create_refund', 'list_refunds'].includes(key) && field === 'transactionReference') ||
  (key === 'list_transfers' && field === 'recipientCode') ||
  (key === 'list_plans' && field === 'subscriptionCount') ||
  (key === 'create_transfer_recipient' && field === 'accountNumber');
const preserves = (
  key: string,
  current: Schema,
  previous: Schema,
  input: boolean,
  path = ''
) => {
  if (typeof previous === 'boolean' || typeof current === 'boolean') {
    expect(current).toEqual(previous);
    return;
  }
  expect(current.type, path).toEqual(previous.type);
  expect(current.default, path).toEqual(previous.default);
  if (previous.enum) expect(current.enum).toEqual(expect.arrayContaining(previous.enum));
  if (input)
    expect(previous.required ?? []).toEqual(expect.arrayContaining(current.required ?? []));
  else
    for (const field of previous.required ?? []) {
      if (!(current.required ?? []).includes(field))
        expect(
          permittedOmission(key, field),
          `${key}${path}.${field} needs an explicit compatibility exception`
        ).toBe(true);
    }
  for (const [field, schema] of Object.entries(previous.properties ?? {})) {
    const next = current.properties?.[field];
    expect(next, `${path}.${field}`).toBeDefined();
    preserves(key, next!, schema, input, `${path}.${field}`);
  }
  if (previous.items && !Array.isArray(previous.items)) {
    if (Array.isArray(current.items)) throw new Error('Array item schema became a tuple.');
    preserves(key, current.items!, previous.items, input, `${path}[]`);
  }
  if (previous.anyOf) {
    expect(current.anyOf).toHaveLength(previous.anyOf.length);
    previous.anyOf.forEach((value, index) =>
      preserves(key, current.anyOf![index]!, value, input, path)
    );
  }
};
describe('Paystack legacy contracts and explicit output exceptions', () => {
  for (const [key, contract] of Object.entries(legacy))
    it(`retains ${key} fields and types with documented output omissions`, () => {
      const action = provider.actions.find(
        action => action.type === 'tool' && action.key === key
      );
      if (!action || action.type !== 'tool') throw new Error('Legacy tool missing.');
      preserves(
        key,
        action.inputSchema.toJSONSchema({ unrepresentable: 'any' }),
        contract.input,
        true
      );
      preserves(
        key,
        action.outputSchema.toJSONSchema({ unrepresentable: 'any' }),
        contract.output,
        false
      );
    });
  it('retains36 and adds exactly five approved tools with short production IDs', () => {
    expect(Object.keys(legacy)).toHaveLength(36);
    const tools = provider.actions.filter(action => action.type === 'tool');
    expect(tools).toHaveLength(41);
    expect(
      tools
        .map(tool => tool.key)
        .filter(key => !(key in legacy))
        .sort()
    ).toEqual([
      'archive_payment_request',
      'delete_transfer_recipient',
      'get_balance',
      'list_transfer_recipients',
      'verify_transfer'
    ]);
    expect(provider.actions.filter(action => action.type !== 'tool')).toHaveLength(0);
    for (const tool of tools) expect(`paystack-${tool.key}`.length).toBeLessThan(60);
  });
  it('every legacy numeric resource ID has an exact string companion', () => {
    const inspect = (schema: Schema) => {
      if (typeof schema === 'boolean') return;
      for (const [field, value] of Object.entries(schema.properties ?? {})) {
        if (/Id$/.test(field) && typeof value !== 'boolean' && value.type === 'number') {
          const exact = `exact${field.charAt(0).toUpperCase()}${field.slice(1)}`;
          expect(schema.properties?.[exact], field).toMatchObject({ type: 'string' });
        }
        inspect(value);
      }
      if (schema.items && !Array.isArray(schema.items)) inspect(schema.items);
    };
    for (const tool of provider.actions)
      if (tool.type === 'tool')
        inspect(tool.outputSchema.toJSONSchema({ unrepresentable: 'any' }));
  });
});
