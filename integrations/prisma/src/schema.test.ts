import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Prisma input schemas', provider.actions);
describe('Prisma retained input contracts', () => {
  it('preserves all original tool keys and keeps IDs short', () => {
    const keys = provider.actions.map(action => action.key);
    for (const key of [
      'list_workspaces',
      'create_project',
      'get_project',
      'transfer_project',
      'list_databases',
      'get_database',
      'create_database',
      'delete_database',
      'list_connections',
      'create_connection',
      'delete_connection',
      'get_database_backups',
      'get_database_usage'
    ])
      expect(keys).toContain(key);
    for (const key of keys) expect(`prisma-${key}`.length).toBeLessThan(60);
  });
  it('keeps existing caller inputs optional and unchanged', () => {
    const tool = (key: string) => {
      const action = provider.actions.find(value => value.key === key);
      if (!action || action.type !== 'tool') throw new Error('Required tool missing.');
      return z.toJSONSchema(action.inputSchema);
    };
    expect(tool('create_project').required).toEqual(['name']);
    expect(tool('create_connection').required).toEqual(['databaseId']);
    expect(tool('get_database_usage').required).toEqual(['databaseId']);
    expect(tool('create_database').required).toEqual(['projectId', 'name', 'region']);
    expect(tool('create_database').properties?.region).toMatchObject({ type: 'string' });
    expect(tool('list_databases').required ?? []).toEqual([]);
  });
});
