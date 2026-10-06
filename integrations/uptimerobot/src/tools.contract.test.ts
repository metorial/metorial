import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import {
  createAlertContact,
  createMaintenanceWindow,
  createMonitor,
  manageMonitor
} from './tools';

describeMcpCompatibleToolSchemas('UptimeRobot tool input schemas', provider.actions);
describe('UptimeRobot compatibility contracts', () => {
  it('preserves fourteen established tool keys alongside five current tools', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [
        'list_monitors',
        'create_monitor',
        'update_monitor',
        'delete_monitor',
        'list_alert_contacts',
        'create_alert_contact',
        'delete_alert_contact',
        'list_status_pages',
        'create_status_page',
        'delete_status_page',
        'list_maintenance_windows',
        'create_maintenance_window',
        'delete_maintenance_window',
        'get_account_details',
        'who_am_i',
        'list_current_monitors',
        'get_monitor',
        'manage_monitor',
        'list_incidents'
      ].sort()
    );
  });
  it('retains supported legacy types and retired SMS input compatibility', () => {
    expect(z.toJSONSchema(createMonitor.inputSchema).properties?.type).toMatchObject({
      enum: ['http', 'keyword', 'ping', 'port', 'heartbeat']
    });
    expect(z.toJSONSchema(createAlertContact.inputSchema).properties?.type).toMatchObject({
      enum: ['sms', 'email', 'webhook', 'pushbullet', 'pushover']
    });
    expect(
      z.toJSONSchema(createMaintenanceWindow.inputSchema).properties?.startTime
    ).toMatchObject({ type: 'string' });
    expect(z.toJSONSchema(createMonitor.outputSchema).properties?.status).toMatchObject({
      type: 'number'
    });
  });
  it('keeps current operations explicit and secret-bearing fields out of outputs', () => {
    expect(z.toJSONSchema(manageMonitor.inputSchema).properties?.action).toMatchObject({
      enum: ['create', 'update', 'pause', 'start', 'delete']
    });
    for (const key of ['get_monitor', 'list_current_monitors', 'manage_monitor']) {
      const action = provider.actions.find(action => action.key === key)!;
      const encoded = JSON.stringify(z.toJSONSchema(action.outputSchema));
      for (const secret of [
        'apiKey',
        'httpPassword',
        'customHttpHeaders',
        'postValueData',
        'heartbeatUrl'
      ])
        expect(encoded).not.toContain(`"${secret}"`);
    }
  });
});
