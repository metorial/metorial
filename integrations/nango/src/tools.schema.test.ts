import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { z } from './lib/schemas';

describeMcpCompatibleToolSchemas('Nango tool input schemas', provider.actions);
const legacy = {
  list_integrations: [],
  list_connections: ['connectionId', 'search', 'limit', 'page'],
  manage_integration: [
    'action',
    'uniqueKey',
    'provider',
    'displayName',
    'credentials',
    'include'
  ],
  manage_connection: [
    'action',
    'connectionId',
    'providerConfigKey',
    'forceRefresh',
    'includeRefreshToken',
    'credentials',
    'metadata',
    'connectionConfig',
    'tags'
  ],
  manage_connection_metadata: ['action', 'connectionId', 'providerConfigKey', 'metadata'],
  manage_sync: ['action', 'providerConfigKey', 'syncs', 'connectionId', 'reset', 'emptyCache'],
  get_records: [
    'connectionId',
    'providerConfigKey',
    'model',
    'cursor',
    'modifiedAfter',
    'recordIds',
    'limit'
  ],
  proxy_request: [
    'method',
    'endpoint',
    'connectionId',
    'providerConfigKey',
    'requestBody',
    'queryParams',
    'retries',
    'baseUrlOverride',
    'headers'
  ],
  trigger_action: ['connectionId', 'providerConfigKey', 'actionName', 'actionInput'],
  create_connect_session: [
    'endUserId',
    'endUserEmail',
    'endUserDisplayName',
    'endUserTags',
    'organizationId',
    'organizationDisplayName',
    'allowedIntegrations',
    'integrationsConfigDefaults'
  ]
};
describe('Nango compatibility contracts', () => {
  for (const [key, fields] of Object.entries(legacy))
    it('preserves ' + key + ' input fields', () => {
      const tool = provider.actions.find(action => action.key === key);
      expect(tool).toBeDefined();
      const schema = z.toJSONSchema(tool!.inputSchema) as {
        properties: Record<string, unknown>;
      };
      for (const field of fields) expect(schema.properties).toHaveProperty(field);
    });
  it('registers exactly twelve public keys', () =>
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [...Object.keys(legacy), 'list_functions', 'list_providers'].sort()
    ));
  it('keeps production tool IDs below 60 characters', () => {
    for (const action of provider.actions)
      expect(('nango-' + action.key).length).toBeLessThan(60);
  });
  it('preserves supported consolidated action and method enum values', () => {
    const tool = (key: string) => provider.actions.find(action => action.key === key)!;
    for (const action of ['create', 'get', 'update', 'delete'])
      expect(
        tool('manage_integration').inputSchema.safeParse({ action, uniqueKey: 'controlled' })
          .success
      ).toBe(true);
    for (const action of ['create', 'get', 'delete'])
      expect(
        tool('manage_connection').inputSchema.safeParse({
          action,
          connectionId: 'owned',
          providerConfigKey: 'controlled'
        }).success
      ).toBe(true);
    for (const action of ['trigger', 'start', 'pause', 'status'])
      expect(
        tool('manage_sync').inputSchema.safeParse({
          action,
          providerConfigKey: 'controlled',
          syncs: ['sync', { name: 'sync', variant: 'variant' }]
        }).success
      ).toBe(true);
    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
      expect(
        tool('proxy_request').inputSchema.safeParse({
          method,
          connectionId: 'owned',
          providerConfigKey: 'controlled',
          endpoint: 'records'
        }).success
      ).toBe(true);
  });
  it('retains legacy secret and override fields as valid schema input for actionable runtime refusal', () => {
    expect(
      provider.actions
        .find(action => action.key === 'manage_connection')!
        .inputSchema.safeParse({
          action: 'get',
          connectionId: 'owned',
          providerConfigKey: 'controlled',
          includeRefreshToken: true
        }).success
    ).toBe(true);
    expect(
      provider.actions
        .find(action => action.key === 'proxy_request')!
        .inputSchema.safeParse({
          method: 'GET',
          endpoint: 'records',
          connectionId: 'owned',
          providerConfigKey: 'controlled',
          baseUrlOverride: 'https://example.invalid'
        }).success
    ).toBe(true);
  });
  it('has no legacy trigger registrations', () =>
    expect(provider.actions.every(action => action.type === 'tool')).toBe(true));
});
