import {
  describeMcpCompatibleToolSchemas,
  getMcpCompatibleToolSchemaCases
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { z } from './lib/native';
import { manageSimCard } from './tools/manage-sim-card';

describeMcpCompatibleToolSchemas('Telnyx tool schemas', provider);
describe('Telnyx retained schema contracts', () => {
  const tools = new Map(getMcpCompatibleToolSchemaCases(provider));
  it('retains all 16 original public keys and the bounded additions', () => {
    expect([...tools.keys()].filter(key => !key.startsWith('metorial$')).sort()).toEqual(
      [
        'send_message',
        'get_message',
        'search_phone_numbers',
        'order_phone_numbers',
        'list_phone_numbers',
        'manage_phone_number',
        'send_verification',
        'verify_code',
        'manage_verify_profile',
        'number_lookup',
        'send_fax',
        'dial_call',
        'call_action',
        'manage_messaging_profile',
        'manage_sim_card',
        'get_balance',
        'list_connections',
        'get_fax'
      ].sort()
    );
  });
  it('keeps production IDs below the bridge limit', () => {
    for (const key of tools.keys()) expect(`telnyx-${key}`.length).toBeLessThan(60);
  });
  it('preserves legacy action aliases and additional parameter object shape', () => {
    const schema = z.toJSONSchema(tools.get('call_action')!.inputSchema);
    expect(schema.type).toBe('object');
    expect(JSON.stringify(schema)).toContain('play_audio');
    expect(JSON.stringify(schema)).toContain('actionParams');
  });
  it('retains legacy Verify timeout and SIM byte field compatibility', () => {
    expect(
      JSON.stringify(z.toJSONSchema(tools.get('manage_verify_profile')!.inputSchema))
    ).toContain('defaultTimeoutSecs');
    expect(JSON.stringify(z.toJSONSchema(manageSimCard.outputSchema))).toContain(
      'currentBillingPeriodConsumedDataBytes'
    );
  });
  it('does not add token destination settings or fictional identity', () => {
    expect(tools.has('get_current_user')).toBe(false);
    expect(tools.has('get_current_account')).toBe(false);
  });
  it('adds explicit native messaging destinations without changing legacy action fields', () => {
    const schema = z.toJSONSchema(tools.get('manage_messaging_profile')!.inputSchema);
    expect(schema.type).toBe('object');
    expect(schema.properties).toHaveProperty('whitelistedDestinations');
    expect(schema.required).not.toContain('whitelistedDestinations');
    expect(schema.properties).toHaveProperty('webhookApiVersion');
    expect(schema.properties).toHaveProperty('enabled');
  });
});
