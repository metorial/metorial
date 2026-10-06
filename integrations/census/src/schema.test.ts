import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Census tool input schemas', provider.actions);
it('preserves stored token and region while auth owns new region', () => {
  expect(spec.authSchema.parse({ token: 'schema-only-token' })).toEqual({
    token: 'schema-only-token'
  });
  expect(spec.configSchema.parse({ region: 'eu' })).toEqual({ region: 'eu' });
  expect(z.toJSONSchema(spec.configSchema).properties).not.toHaveProperty('region');
  expect(
    spec.authSchema.parse({
      token: 'schema-only-token',
      region: 'eu',
      credentialType: 'personal'
    })
  ).toMatchObject({ region: 'eu', credentialType: 'personal' });
});
