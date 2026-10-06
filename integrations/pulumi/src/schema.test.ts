import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Pulumi tool input schemas', provider.actions);

it('retains stored API origins without exposing duplicate configuration', () => {
  const value = { baseUrl: 'https://api.example.test', organization: 'example' };
  expect(spec.configSchema.parse(value)).toEqual(value);
  const schema = z.toJSONSchema(spec.configSchema);
  expect(schema.properties).not.toHaveProperty('baseUrl');
});

it('accepts token-only stored auth and persisted API origins', () => {
  expect(spec.authSchema.parse({ token: 'schema-only-token' })).toEqual({
    token: 'schema-only-token'
  });
  const value = { token: 'schema-only-token', baseUrl: 'https://api.example.test' };
  expect(spec.authSchema.parse(value)).toEqual(value);
});
