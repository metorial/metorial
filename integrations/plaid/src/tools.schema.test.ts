import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import original from './compatibility.schemas.json';
import { config } from './config';
import { provider } from './index';

type Row = Record<string, unknown>;
const isRow = (value: unknown): value is Row =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const row = (value: unknown): Row => {
  if (!isRow(value)) throw new Error('Expected a schema object.');
  return value;
};
const nullable = (value: unknown) => {
  const field = row(value),
    type = field.type;
  delete field.type;
  field.anyOf = [{ type }, { type: 'null' }];
};
const schema = (value: z.ZodType, input = false) => {
  const simplify = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(simplify)
      : item && typeof item === 'object'
        ? Object.fromEntries(
            Object.entries(item)
              .filter(([key]) => !['description', '$schema'].includes(key))
              .map(([key, value]) => [key, simplify(value)])
          )
        : item;
  return row(
    simplify(z.toJSONSchema(value, { io: input ? 'input' : 'output', unrepresentable: 'any' }))
  );
};
const property = (value: unknown, name: string) => row(row(value).properties)[name];
const items = (value: unknown) => row(row(value).items);
const adjustedOutput = (key: string, value: unknown): Row => {
  const expected = row(structuredClone(value));
  if (key === 'evaluate_signal')
    for (const field of ['customerInitiatedReturnRisk', 'bankInitiatedReturnRisk'])
      nullable(property(expected, field));
  if (key === 'get_liabilities')
    for (const field of ['credit', 'student'])
      nullable(property(items(property(expected, field)), 'accountId'));
  if (key === 'get_transfer')
    expected.required = z
      .array(z.string())
      .parse(expected.required)
      .filter(field => field !== 'accountId');
  if (key === 'get_identity') {
    const address = items(
      property(items(property(items(property(expected, 'accounts')), 'owners')), 'addresses')
    );
    const required = z
      .array(z.string())
      .parse(address.required)
      .filter(field => field !== 'primary');
    if (required.length) address.required = required;
    else delete address.required;
  }
  return expected;
};

describeMcpCompatibleToolSchemas('Plaid tool input schemas', provider.actions);
describe('Plaid legacy contracts and approved scope', () => {
  for (const [key, saved] of Object.entries(original)) {
    it(key + ' preserves all original input fields, types and requiredness', () => {
      const current = schema(
        provider.actions.find(action => action.key === key)!.inputSchema,
        true
      );
      expect(current).toMatchObject(saved.input);
      expect(current.required ?? []).toEqual(row(saved.input).required ?? []);
    });
    it(key + ' preserves output fields with only documented absence relaxations', () => {
      expect(
        schema(provider.actions.find(action => action.key === key)!.outputSchema)
      ).toMatchObject(adjustedOutput(key, saved.output));
    });
  }
  it('retains all 22 keys and only the three approved additions', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [
        ...Object.keys(original),
        'manage_transfer_authorization',
        'cancel_transfer',
        'remove_asset_report'
      ].sort()
    );
    for (const action of provider.actions)
      expect(('plaid-' + action.key).length).toBeLessThan(60);
    expect(provider.triggerGroups).toHaveLength(0);
  });
  it('preserves credential keys and tool-scoped environment configuration', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['api_credentials']);
    expect(schema(auth.authStack[0]!.inputSchema!, true)).toMatchObject({
      properties: { clientId: { type: 'string' }, secret: { type: 'string' } },
      required: ['clientId', 'secret']
    });
    expect(config.configSchema.parse({})).toEqual({ environment: 'sandbox' });
    expect(config.configSchema.safeParse({ environment: 'production' }).success).toBe(true);
    expect(config.configSchema.safeParse({ environment: 'unknown' }).success).toBe(false);
  });
  it('marks retained Signal evaluation and money movement as effects', () => {
    for (const key of [
      'evaluate_signal',
      'manage_transfer_authorization',
      'cancel_transfer',
      'remove_asset_report'
    ])
      expect(provider.actions.find(action => action.key === key)?.tags?.readOnly).toBe(false);
    expect(
      provider.actions.find(action => action.key === 'create_transfer')?.tags?.destructive
    ).toBe(true);
  });
  it('keeps legacy JSON report calls valid and PDF optional', () => {
    const tool = provider.actions.find(action => action.key === 'get_asset_report')!;
    expect(tool.inputSchema.parse({ assetReportToken: 'synthetic-token' })).toEqual({
      assetReportToken: 'synthetic-token',
      format: 'json'
    });
  });
});
