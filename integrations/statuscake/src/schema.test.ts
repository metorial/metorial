import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('StatusCake input schemas', provider.actions);
describe('StatusCake retained contracts', () => {
  it('retains all original keys and keeps IDs short', () => {
    const keys = provider.actions.map(action => action.key);
    const families = [
      'uptime_test',
      'pagespeed_test',
      'ssl_test',
      'heartbeat_test',
      'contact_group',
      'maintenance_window'
    ];
    for (const family of families) {
      for (const operation of ['create', 'get', 'update', 'delete'])
        expect(keys).toContain(`${operation}_${family}`);
      expect(keys).toContain(`list_${family}s`);
    }
    for (const key of [
      'get_uptime_history',
      'get_pagespeed_history',
      'list_monitoring_locations'
    ])
      expect(keys).toContain(key);
    for (const key of keys) expect(`statuscake-${key}`.length).toBeLessThan(60);
  });
  it('retains the legacy string cursors and optional SSL alert schedule', () => {
    const history = provider.actions.find(action => action.key === 'get_uptime_history');
    const ssl = provider.actions.find(action => action.key === 'create_ssl_test');
    if (!history || history.type !== 'tool' || !ssl || ssl.type !== 'tool')
      throw new Error('Required tools missing.');
    const input = z.toJSONSchema(history.inputSchema);
    expect(input.properties?.before).toMatchObject({ type: 'string' });
    expect(input.properties?.after).toMatchObject({ type: 'string' });
    expect(input.properties?.page).toMatchObject({ type: 'number' });
    expect(z.toJSONSchema(ssl.inputSchema).required).not.toContain('alertAt');
  });
});
