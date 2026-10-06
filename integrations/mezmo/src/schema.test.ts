import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { channelSchema } from './lib/schemas';
import { getUsage, listPresetAlerts } from './tools';

describeMcpCompatibleToolSchemas('Mezmo tool input schemas', provider.actions);

it('retains usage variants and numeric field types in an object schema', () => {
  const schema = z.toJSONSchema(getUsage.inputSchema);
  expect(schema.properties?.breakdown).toMatchObject({
    enum: ['account', 'apps', 'hosts', 'tags'],
    default: 'account'
  });
  expect(schema.properties?.metric).toMatchObject({ enum: ['percentage', 'bytes'] });
  expect(schema.properties?.from).toMatchObject({ type: 'number' });
  expect(schema.properties?.to).toMatchObject({ type: 'number' });
  const channel = z.toJSONSchema(channelSchema);
  expect(channel.properties?.immediate).toMatchObject({ type: 'string' });
  expect(channel.properties?.terminal).toMatchObject({ type: 'string' });
  expect(channel.properties?.triggerlimit).toMatchObject({ type: 'number' });
});

it('preserves the optional legacy channel credential field in the output contract', () => {
  const channel = { integration: 'pagerduty' };
  const alert = { presetAlertId: 'provider-id', name: 'test', channels: [channel] };
  expect(
    listPresetAlerts.outputSchema.safeParse({ returnedCount: 1, alerts: [alert] }).success
  ).toBe(true);
  expect(
    listPresetAlerts.outputSchema.safeParse({
      returnedCount: 1,
      alerts: [{ ...alert, channels: [{ ...channel, key: 'legacy' }] }]
    }).success
  ).toBe(true);
});
