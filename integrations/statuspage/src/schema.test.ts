import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { config } from './config';
import { provider } from './index';
import { createIncident, manageSubscriber, submitMetricData, updatePage } from './tools';

describeMcpCompatibleToolSchemas('Statuspage tool input schemas', provider.actions);
it('preserves the fourteen legacy tools and adds two essential discovery/lifecycle tools', () => {
  expect(provider.actions).toHaveLength(16);
  for (const key of [
    'get_page',
    'update_page',
    'list_components',
    'manage_component',
    'manage_component_group',
    'list_incidents',
    'get_incident',
    'create_incident',
    'update_incident',
    'list_incident_templates',
    'manage_subscriber',
    'list_subscribers',
    'submit_metric_data',
    'manage_postmortem'
  ])
    expect(provider.actions.some(tool => tool.key === key)).toBe(true);
  for (const tool of provider.actions) {
    expect(`statuspage-${tool.key}`.length).toBeLessThan(60);
    expect(JSON.stringify(z.toJSONSchema(tool.inputSchema))).not.toContain('"type":"integer"');
    if (tool.key !== 'list_pages')
      expect(z.toJSONSchema(tool.inputSchema).properties).toHaveProperty('pageId');
  }
});
it('preserves legacy subscriber options and numeric metric point schemas', () => {
  expect(
    manageSubscriber.inputSchema.safeParse({
      subscriberId: 'subscriber',
      resubscribe: true,
      type: 'teams'
    }).success
  ).toBe(true);
  expect(
    submitMetricData.inputSchema.safeParse({
      metricId: 'metric',
      dataPoints: [{ timestamp: 1.5, value: 0 }]
    }).success
  ).toBe(true);
  expect(
    updatePage.inputSchema.safeParse({ cssBody: 'legacy', allowEmail: false }).success
  ).toBe(true);
});
it('retains realtime status constraints and supports scheduled calls without altering the legacy enum', () => {
  expect(
    createIncident.inputSchema.safeParse({
      name: 'maintenance',
      scheduledFor: '2026-10-05T10:00:00Z',
      scheduledUntil: '2026-10-05T11:00:00Z'
    }).success
  ).toBe(true);
  expect(
    createIncident.inputSchema.safeParse({ name: 'maintenance', status: 'scheduled' }).success
  ).toBe(false);
});

it('allows page discovery without a required opaque connection ID', () => {
  expect(config.configSchema.safeParse({}).success).toBe(true);
  expect(config.handlers.getDefaultConfig?.()).toEqual({});
});
