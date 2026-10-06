import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { config } from './config';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Budibase tool inputs', provider.actions);
const legacy = [
  'search_applications',
  'manage_application',
  'publish_application',
  'search_tables',
  'manage_table',
  'search_rows',
  'manage_row',
  'search_users',
  'manage_user',
  'search_queries',
  'execute_query'
];
it('retains every legacy key and only adds the licensed export', () =>
  expect(provider.actions.map(action => action.key).sort()).toEqual(
    [...legacy, 'export_application'].sort()
  ));
it('keeps every production ID under sixty characters', () => {
  for (const action of provider.actions)
    expect(`budibase-${action.key}`.length).toBeLessThan(60);
});
it('retains legacy baseUrl through actual stored configuration parsing', () => {
  expect(
    config.configSchema.parse({ baseUrl: 'https://instance.example/api/public/v1' })
  ).toEqual({ baseUrl: 'https://instance.example/api/public/v1' });
  expect(config.configSchema.parse({})).toEqual({});
});
it.each([
  'manage_application',
  'manage_table',
  'manage_row',
  'manage_user'
])('retains the four legacy actions for %s', key => {
  const action = provider.actions.find(item => item.key === key)!;
  for (const value of ['create', 'get', 'update', 'delete'])
    expect(
      action.inputSchema.safeParse({
        action: value,
        appId: 'app_dev_test',
        tableId: 'ta_test'
      }).success
    ).toBe(true);
});
it.each([0, 1.5, 1001])('rejects invalid row limit %s', limit =>
  expect(
    provider.actions
      .find(action => action.key === 'search_rows')!
      .inputSchema.safeParse({ appId: 'app_dev_test', tableId: 'ta_test', limit }).success
  ).toBe(false));
it.each([0, ''])('preserves native bookmark %s', bookmark =>
  expect(
    provider.actions
      .find(action => action.key === 'search_rows')!
      .inputSchema.safeParse({ appId: 'app_dev_test', tableId: 'ta_test', bookmark }).success
  ).toBe(true));
it('defaults to a row-free export and contains no inline file output', () => {
  const action = provider.actions.find(item => item.key === 'export_application')!;
  expect(action.inputSchema.parse({ appId: 'app_dev_test' })).toEqual({
    appId: 'app_dev_test',
    excludeRows: true
  });
});
