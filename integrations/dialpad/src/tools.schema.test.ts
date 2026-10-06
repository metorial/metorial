import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { auth } from './auth';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Dialpad tool inputs', provider.actions);
const legacy = [
  'list_users',
  'get_user',
  'manage_user',
  'list_contacts',
  'manage_contact',
  'send_sms',
  'initiate_call',
  'list_calls',
  'manage_call',
  'list_call_centers',
  'manage_call_center',
  'manage_phone_number',
  'list_offices',
  'manage_blocked_number',
  'get_company'
];
it('retains every legacy key and adds only the two documented resource tools', () =>
  expect(provider.actions.map(item => item.key).sort()).toEqual(
    [...legacy, 'get_resource', 'list_resources'].sort()
  ));
it('keeps production identifiers under sixty characters', () => {
  for (const action of provider.actions)
    expect(`dialpad-${action.key}`.length).toBeLessThan(60);
});
it('retains all four connection keys', () =>
  expect(auth.authStack.map(item => item.key).sort()).toEqual([
    'api_key_production',
    'api_key_sandbox',
    'oauth_production',
    'oauth_sandbox'
  ]));
const input = (key: string) => {
  const action = provider.actions.find(item => item.key === key);
  if (!action) throw new Error('Missing schema contract');
  return action.inputSchema;
};
it.each([
  'hangup',
  'transfer',
  'toggle_recording'
])('preserves legacy call action %s', action =>
  expect(
    input('manage_call').safeParse({
      action,
      callId: '10',
      transferType: 'warm',
      recordingEnabled: false
    }).success
  ).toBe(true));
it.each([
  'create',
  'update',
  'delete'
])('preserves legacy user action %s and timezone field', action =>
  expect(input('manage_user').safeParse({ action, timezone: 'UTC' }).success).toBe(true));
it.each([
  'create',
  'update',
  'upsert',
  'delete'
])('preserves legacy contact action %s', action =>
  expect(input('manage_contact').safeParse({ action, externalUid: 'external' }).success).toBe(
    true
  ));
it('preserves numeric legacy caller and operator inputs', () => {
  expect(
    input('initiate_call').safeParse({ callerUserId: '1', targetUserId: 2 }).success
  ).toBe(true);
  expect(
    input('manage_call_center').safeParse({ action: 'add_operator', operatorUserId: 2 })
      .success
  ).toBe(true);
});
it.each([
  'call',
  'contact',
  'office',
  'call_center',
  'phone_number',
  'blocked_number'
])('documents exact resource selector %s', resourceType =>
  expect(input('get_resource').safeParse({ resourceType, resourceId: '1' }).success).toBe(
    true
  ));
it('limits resource discovery to documented operators', () => {
  expect(
    input('list_resources').safeParse({
      resourceType: 'call_center_operators',
      callCenterId: '1'
    }).success
  ).toBe(true);
  expect(
    input('list_resources').safeParse({ resourceType: 'departments', callCenterId: '1' })
      .success
  ).toBe(false);
});
it('does not fabricate a call ID from a device initiation response', () => {
  const action = provider.actions.find(item => item.key === 'initiate_call');
  expect(
    action?.outputSchema.safeParse({ accepted: true, deviceId: 'device', callerUserId: '1' })
      .success
  ).toBe(true);
});
