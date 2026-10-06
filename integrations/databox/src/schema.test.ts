import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { expect, it } from 'vitest';
import { provider } from './index';
import { spec } from './spec';

const tools = new Map(getMcpCompatibleToolSchemaCases(provider.actions));
describeMcpCompatibleToolSchemas('Databox tool input schemas', provider.actions);
it('retains all twelve legacy keys and the three focused additions', () => {
  expect([...tools.keys()].sort()).toEqual(
    [
      'list_accounts',
      'create_data_source',
      'delete_data_source',
      'list_datasets',
      'create_dataset',
      'delete_dataset',
      'purge_dataset',
      'ingest_data',
      'get_ingestion_status',
      'list_ingestions',
      'list_timezones',
      'validate_key',
      'get_current_user',
      'get_dataset_data',
      'list_data_sources'
    ].sort()
  );
  expect([...tools.keys()].every(key => `databox-${key}`.length < 60)).toBe(true);
});
it('keeps stored token-only authentication and the default v1 config', () => {
  expect(spec.authSchema.parse({ token: 'schema-only-placeholder' })).toEqual({
    token: 'schema-only-placeholder'
  });
  expect(spec.configSchema.parse({})).toEqual({});
  expect(spec.configSchema.parse({ apiVersion: 'v2' })).toEqual({ apiVersion: 'v2' });
});
it('accepts legacy creation fields and additive v2 column types', () => {
  const schema = tools.get('create_dataset')!.inputSchema;
  expect(
    schema.safeParse({ dataSourceId: 1, title: '', primaryKeys: ['record_id'] }).success
  ).toBe(true);
  for (const dataType of ['datetime', 'number', 'string']) {
    expect(
      schema.safeParse({
        dataSourceId: 1,
        title: 'schema',
        columns: [{ id: 'value', dataType }],
        accountId: 2,
        idempotencyKey: 'schema-operation'
      }).success
    ).toBe(true);
  }
  expect(schema.safeParse({ dataSourceId: '1', title: 'schema' }).success).toBe(false);
});
it('permits default-scope source creation while preserving explicit account IDs', () => {
  const schema = tools.get('create_data_source')!.inputSchema;
  expect(schema.safeParse({ title: 'default scope' }).success).toBe(true);
  expect(schema.safeParse({ accountId: 42, title: 'explicit account' }).success).toBe(true);
  expect(schema.safeParse({ accountId: '42', title: 'invalid account' }).success).toBe(false);
});
it('retains dataset identifier strings and record objects across API versions', () => {
  const schema = tools.get('ingest_data')!.inputSchema;
  for (const datasetId of ['8bfba187-84f4-41e2-9dd3-bee4bb884205', '1234567']) {
    expect(
      schema.safeParse({
        datasetId,
        records: [{ value: 1.25, occurred_at: '2026-10-05T12:34:56Z' }]
      }).success
    ).toBe(true);
  }
  expect(schema.safeParse({ datasetId: 1234567, records: [] }).success).toBe(false);
});
