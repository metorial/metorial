import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

const originals = [
  'list_databases',
  'create_database',
  'get_database',
  'delete_database',
  'update_database_configuration',
  'create_database_token',
  'invalidate_database_tokens',
  'list_groups',
  'create_group',
  'get_group',
  'delete_group',
  'manage_group_locations',
  'create_group_token',
  'invalidate_group_tokens',
  'transfer_group',
  'unarchive_group',
  'list_locations',
  'get_organization',
  'manage_members',
  'manage_api_tokens',
  'list_audit_logs'
];
const cases = getMcpCompatibleToolSchemaCases(provider.actions);
const tool = (key: string) => {
  const found = provider.actions.find(action => action.type === 'tool' && action.key === key);
  if (!found || found.type !== 'tool') throw new Error(`Missing ${key}`);
  return found;
};
describeMcpCompatibleToolSchemas('Turso input schemas', provider.actions);
describe('Turso compatible schema evolution', () => {
  it('retains every original key and adds only identity and organization discovery', () => {
    expect(cases.map(([key]) => key).sort()).toEqual(
      [...originals, 'get_current_user', 'list_organizations'].sort()
    );
    for (const [key] of cases) expect(`turso-${key}`.length).toBeLessThan(60);
  });
  it('preserves grandfathered schema/dump, replica and token input branches', () => {
    expect(
      tool('create_database').inputSchema.safeParse({
        databaseName: 'test',
        groupName: 'default',
        seed: { type: 'dump', url: 'https://example.com/test.sql' },
        isSchema: true
      }).success
    ).toBe(true);
    expect(
      tool('create_database').inputSchema.safeParse({
        databaseName: 'test',
        groupName: 'default',
        seed: { type: 'database', name: 'source' },
        schema: 'parent'
      }).success
    ).toBe(true);
    expect(
      tool('manage_group_locations').inputSchema.safeParse({
        groupName: 'test',
        location: 'lhr',
        action: 'remove'
      }).success
    ).toBe(true);
    for (const action of ['list', 'create', 'revoke', 'validate'])
      expect(tool('manage_api_tokens').inputSchema.safeParse({ action }).success).toBe(true);
  });
  it('accepts minimal current creation output and keeps legacy fields optional without changing types', () => {
    expect(
      tool('create_database').outputSchema.safeParse({
        databaseName: 'test',
        databaseId: 'id',
        hostname: 'test.turso.io'
      }).success
    ).toBe(true);
    expect(
      tool('get_database').outputSchema.safeParse({
        databaseName: 'test',
        databaseId: 'id',
        hostname: 'test.turso.io'
      }).success
    ).toBe(true);
    expect(
      tool('list_databases').outputSchema.safeParse({
        databases: [{ databaseName: 'test', databaseId: 'id', hostname: 'test.turso.io' }]
      }).success
    ).toBe(true);
    expect(
      tool('get_database').outputSchema.safeParse({
        databaseName: 'test',
        databaseId: 'id',
        hostname: 'test.turso.io',
        isSchema: 'false'
      }).success
    ).toBe(false);
  });
  it('keeps omitted archive/version/replication output optional', () => {
    for (const key of [
      'get_group',
      'create_group',
      'unarchive_group',
      'manage_group_locations'
    ])
      expect(
        tool(key).outputSchema.safeParse({
          groupName: 'test',
          groupUuid: 'id',
          primary: 'aws-us-east-1'
        }).success
      ).toBe(true);
    expect(
      tool('list_groups').outputSchema.safeParse({
        groups: [{ groupName: 'test', groupUuid: 'id', primary: 'aws-us-east-1' }]
      }).success
    ).toBe(true);
  });
  it('keeps actions, original required fields and new scope fields compatible', () => {
    for (const action of ['list', 'add', 'remove', 'invite', 'list_invites', 'delete_invite'])
      expect(tool('manage_members').inputSchema.safeParse({ action }).success).toBe(true);
    expect(
      tool('manage_members').inputSchema.safeParse({
        action: 'add',
        username: 'test',
        role: 'viewer'
      }).success
    ).toBe(true);
    expect(
      tool('manage_api_tokens').inputSchema.safeParse({
        action: 'create',
        tokenName: 'test',
        organization: 'org',
        group: 'default',
        scopes: ['read-only']
      }).success
    ).toBe(true);
    expect(
      tool('get_database').inputSchema.safeParse({
        databaseName: 'test',
        organizationSlug: 'org'
      }).success
    ).toBe(true);
    expect(
      tool('get_database').inputSchema.safeParse({ organizationSlug: 'org' }).success
    ).toBe(false);
  });
  it('has no top-level branching and retains array clearing semantics', () => {
    const schema = z.toJSONSchema(tool('update_database_configuration').inputSchema);
    expect(schema.type).toBe('object');
    expect(
      tool('update_database_configuration').inputSchema.safeParse({
        databaseName: 'test',
        allowedIps: [],
        allowedAwsVpcIds: [],
        deleteProtection: false
      }).success
    ).toBe(true);
  });
});
