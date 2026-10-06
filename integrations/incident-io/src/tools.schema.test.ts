import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('incident.io tool schemas', provider.actions);

describe('incident.io compatibility schemas', () => {
  it('retains the eighteen established keys and short public tool IDs', () => {
    const keys = provider.actions.map(action => action.key);
    expect(keys).toHaveLength(25);
    for (const key of [
      'list_incidents',
      'get_incident',
      'create_incident',
      'edit_incident',
      'list_alerts',
      'send_alert_event',
      'list_schedules',
      'get_schedule_entries',
      'create_schedule_override',
      'list_catalog_types',
      'list_catalog_entries',
      'manage_catalog_entry',
      'list_severities_and_statuses',
      'list_incident_roles_and_types',
      'list_follow_ups',
      'manage_status_page_incident',
      'list_users',
      'list_workflows'
    ])
      expect(keys).toContain(key);
    for (const key of keys) expect(`incident-io-${key}`.length).toBeLessThan(60);
  });
  it('adds optional alert resolution identifiers without tightening the historical page schema', () => {
    const action = provider.actions.find(action => action.key === 'list_alerts')!;
    const input = z.toJSONSchema(action.inputSchema);
    const output = z.toJSONSchema(action.outputSchema);
    expect(input.properties?.pageSize).toMatchObject({ type: 'number', maximum: 250 });
    const alerts = output.properties?.alerts as {
      items?: { properties?: Record<string, unknown>; required?: string[] };
    };
    for (const key of ['alertSourceId', 'deduplicationKey']) {
      expect(alerts.items?.properties?.[key]).toMatchObject({ type: 'string' });
      expect(alerts.items?.required ?? []).not.toContain(key);
    }
  });
  it('retains the historical number type for each existing page size input', () => {
    for (const key of [
      'list_alerts',
      'list_catalog_entries',
      'list_incidents',
      'list_schedules',
      'list_users'
    ]) {
      const action = provider.actions.find(action => action.key === key)!;
      expect(z.toJSONSchema(action.inputSchema).properties?.pageSize).toMatchObject({
        type: 'number',
        minimum: 1,
        maximum: 250
      });
    }
  });
});
