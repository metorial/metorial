import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('onelogin', provider.actions);
const legacy: Record<string, string[]> = {
  list_users: [
    'firstname',
    'lastname',
    'email',
    'username',
    'directoryId',
    'externalId',
    'appId',
    'createdSince',
    'createdUntil',
    'updatedSince',
    'updatedUntil',
    'limit'
  ],
  get_user: ['userId'],
  create_user: [
    'email',
    'username',
    'firstname',
    'lastname',
    'company',
    'department',
    'title',
    'phone',
    'password',
    'passwordConfirmation',
    'status',
    'groupId',
    'roleIds',
    'customAttributes'
  ],
  update_user: [
    'userId',
    'email',
    'username',
    'firstname',
    'lastname',
    'company',
    'department',
    'title',
    'phone',
    'password',
    'passwordConfirmation',
    'status',
    'state',
    'groupId',
    'roleIds',
    'managerUserId',
    'directoryId',
    'externalId',
    'customAttributes'
  ],
  delete_user: ['userId'],
  list_roles: ['name', 'appId', 'appName', 'includeFields'],
  manage_role: ['action', 'roleId', 'name', 'apps', 'users', 'admins'],
  list_apps: ['name', 'connectorId', 'authMethod'],
  get_app: ['appId'],
  manage_app: [
    'action',
    'appId',
    'connectorId',
    'name',
    'description',
    'visible',
    'policyId',
    'configuration',
    'parameters',
    'provisioning',
    'allowAssumedSignin'
  ],
  list_groups: [],
  list_events: [
    'eventTypeId',
    'userId',
    'since',
    'until',
    'clientId',
    'directoryId',
    'resolution',
    'limit'
  ],
  get_event_types: [],
  manage_user_roles: ['userId', 'action', 'roleIds'],
  get_mfa_factors: ['userId'],
  enroll_mfa_factor: [
    'userId',
    'factorId',
    'displayName',
    'expiresIn',
    'verified',
    'customMessage'
  ],
  verify_mfa_factor: ['userId', 'registrationId', 'otp', 'poll']
};
for (const [key, fields] of Object.entries(legacy))
  it(`retains ${key} input fields`, () => {
    const action = provider.actions.find(action => action.key === key);
    expect(action?.type).toBe('tool');
    if (action?.type !== 'tool')
      throw new Error('Schema contract requires the retained tool.');
    const schema = z.toJSONSchema(action.inputSchema) as {
      properties: Record<string, unknown>;
    };
    expect(Object.keys(schema.properties)).toEqual(expect.arrayContaining(fields));
  });
it('has exactly the approved 19 tools, no triggers, and short IDs', () => {
  expect(provider.actions).toHaveLength(19);
  expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
  for (const action of provider.actions)
    expect(`onelogin-${action.key}`.length).toBeLessThan(60);
});
