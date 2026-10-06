import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Vonage retained tool schemas', provider.actions);
describe('Vonage retained schema contracts', () => {
  it('retains all eleven keys and no trigger registrations', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [
        'check_verification',
        'get_account_info',
        'list_calls',
        'make_call',
        'manage_applications',
        'manage_call',
        'manage_numbers',
        'number_insight',
        'send_message',
        'send_sms',
        'verify_user'
      ].sort()
    );
    expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
    expect(provider.actions.every(action => `vonage-${action.key}`.length < 60)).toBe(true);
  });
  it('retains optional legacy create inputs and channel combinations', () => {
    const cases = [
      ['manage_applications', { action: 'create', name: 'Legacy name' }],
      ['get_account_info', { action: 'create_subaccount', subaccountName: 'Legacy' }],
      [
        'send_message',
        { channel: 'rcs', messageType: 'audio', from: 'sender', to: 'recipient' }
      ],
      [
        'verify_user',
        { brand: 'Brand', to: 'user@example.test', workflows: [{ channel: 'email' }] }
      ],
      ['make_call', { toNumber: '14155550100', fromNumber: '14155550101' }],
      [
        'manage_numbers',
        { action: 'update', country: 'US', msisdn: '14155550100', moHttpUrl: '' }
      ]
    ] as const;
    for (const [key, input] of cases) {
      const action = provider.actions.find(action => action.key === key);
      expect(action?.type).toBe('tool');
      if (action?.type === 'tool')
        expect(action.inputSchema.safeParse(input).success).toBe(true);
    }
  });
});
