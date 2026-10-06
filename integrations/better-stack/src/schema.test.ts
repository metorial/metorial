import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { manageAlert, manageHeartbeat, manageIncomingWebhook, manageSource } from './tools';

describeMcpCompatibleToolSchemas('Better Stack tool input schemas', provider.actions);

it('preserves public IDs and legacy numeric schema types', () => {
  expect(provider.actions).toHaveLength(12);
  for (const tool of provider.actions) {
    expect(`better-stack-${tool.key}`.length).toBeLessThan(60);
    expect(JSON.stringify(z.toJSONSchema(tool.inputSchema))).not.toContain('"type":"integer"');
    expect(JSON.stringify(z.toJSONSchema(tool.outputSchema))).not.toContain(
      '"type":"integer"'
    );
  }
});
it('keeps alert context optional for legacy list, get, update and delete calls', () => {
  for (const input of [
    { action: 'list' },
    { action: 'get', alertId: '123' },
    { action: 'update', alertId: '123', enabled: false },
    { action: 'delete', alertId: '123' },
    { action: 'create', alertType: 'anomaly', sourceId: '123', query: 'legacy', threshold: 0 }
  ])
    expect(manageAlert.inputSchema.safeParse(input).success).toBe(true);
});
it('retains deprecated source fields and nullable credential output schema', () => {
  expect(
    manageSource.inputSchema.safeParse({
      action: 'update',
      sourceId: '1',
      liveTrailEnabled: false
    }).success
  ).toBe(true);
  const source = {
    sourceId: '1',
    name: null,
    platform: null,
    token: null,
    tableId: null,
    logsRetentionDays: null,
    metricsRetentionDays: null,
    liveTrailEnabled: null,
    createdAt: null,
    updatedAt: null
  };
  expect(manageSource.outputSchema.safeParse({ source }).success).toBe(true);
  expect(
    manageSource.outputSchema.safeParse({
      source: { ...source, token: 'legacy-contract-value' }
    }).success
  ).toBe(true);
});
it('retains nullable receiving URL contracts while allowing credential-free results', () => {
  const heartbeat = {
    heartbeatId: '1',
    name: null,
    url: null,
    period: null,
    grace: null,
    status: null,
    paused: null,
    createdAt: null
  };
  const webhook = {
    webhookId: '2',
    name: null,
    url: null,
    callUrl: null,
    createdAt: null,
    updatedAt: null
  };
  for (const url of [null, 'https://example.invalid/legacy-secret-url']) {
    expect(
      manageHeartbeat.outputSchema.safeParse({ heartbeat: { ...heartbeat, url } }).success
    ).toBe(true);
    expect(
      manageIncomingWebhook.outputSchema.safeParse({
        webhook: { ...webhook, url, callUrl: url }
      }).success
    ).toBe(true);
  }
});
it('keeps alert location fields additive and optional', () => {
  const alert = {
    alertId: '1',
    name: null,
    alertType: null,
    enabled: null,
    sourceId: null,
    query: null,
    threshold: null,
    confirmationPeriodSeconds: null,
    recoveryPeriodSeconds: null,
    createdAt: null,
    updatedAt: null
  };
  for (const context of [{}, { dashboardId: '2', chartId: '3' }, { explorationId: '4' }])
    expect(
      manageAlert.outputSchema.safeParse({ alert: { ...alert, ...context } }).success
    ).toBe(true);
});
