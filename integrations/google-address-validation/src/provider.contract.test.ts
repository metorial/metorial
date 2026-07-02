import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleAddressValidationActionScopes } from './scopes';

describe('google-address-validation provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-address-validation',
        name: 'Google Address Validation',
        description:
          'Validates, standardizes, and geocodes postal addresses using the Google Maps Platform Address Validation API.'
      },
      toolIds: ['validate_address', 'provide_validation_feedback'],
      triggerIds: ['inbound_webhook'],
      authMethodIds: ['api_key', 'oauth'],
      triggers: [{ id: 'inbound_webhook', invocationType: 'webhook' }]
    });

    expect(contract.actions).toHaveLength(3);

    let expectedScopes = {
      validate_address: googleAddressValidationActionScopes.validateAddress,
      provide_validation_feedback:
        googleAddressValidationActionScopes.provideValidationFeedback
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
  });
});
