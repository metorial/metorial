import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

const legacyKeys = [
  'list_employees',
  'get_employee',
  'get_company',
  'create_group',
  'get_group',
  'update_group',
  'delete_group',
  'list_leave_requests',
  'process_leave_request',
  'push_candidate',
  'list_departments',
  'list_teams',
  'list_work_locations',
  'list_levels',
  'get_saml_metadata',
  'list_leave_types',
  'get_leave_balances',
  'get_current_user',
  'list_custom_fields'
];
describeMcpCompatibleToolSchemas('Rippling input schemas', provider.actions);
describe('Rippling preserved tool surface', () => {
  it('preserves the 19 legacy keys without expanding scope', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual([...legacyKeys].sort());
    expect(provider.actions.every(action => `rippling-${action.key}`.length < 60)).toBe(true);
  });
  it('preserves legacy leave action values and adds opaque group concurrency', () => {
    const group = provider.actions.find(action => action.key === 'update_group');
    expect(
      group?.inputSchema.safeParse({ groupId: 'group', name: 'name', version: 1 }).success
    ).toBe(true);
    expect(
      group?.inputSchema.safeParse({
        groupId: 'group',
        name: 'name',
        versionToken: 'opaque-token'
      }).success
    ).toBe(true);
    const leave = provider.actions.find(action => action.key === 'process_leave_request');
    expect(
      leave?.inputSchema.safeParse({ leaveRequestId: 'leave', action: 'APPROVE' }).success
    ).toBe(true);
    expect(
      leave?.inputSchema.safeParse({ leaveRequestId: 'leave', action: 'DECLINE' }).success
    ).toBe(true);
  });
});
