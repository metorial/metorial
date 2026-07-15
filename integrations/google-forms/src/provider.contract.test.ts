import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleFormsActionScopes } from './scopes';

describe('google-forms provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-forms',
        name: 'Google Forms',
        description:
          'Create, manage, and retrieve Google Forms and their responses. Supports form creation, quiz configuration, response retrieval, and push notification watches.'
      },
      toolIds: [
        'create_form',
        'get_form',
        'update_form',
        'set_publish_settings',
        'get_response',
        'list_responses',
        'manage_watches'
      ],
      triggerIds: ['inbound_webhook', 'new_response', 'form_updated'],
      authMethodIds: ['oauth'],
      tools: [
        { id: 'create_form', readOnly: false, destructive: false },
        { id: 'get_form', readOnly: true, destructive: false },
        { id: 'update_form', readOnly: false, destructive: true },
        { id: 'set_publish_settings', readOnly: false, destructive: false },
        { id: 'get_response', readOnly: true, destructive: false },
        { id: 'list_responses', readOnly: true, destructive: false },
        { id: 'manage_watches', readOnly: false, destructive: false }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'new_response', invocationType: 'polling' },
        { id: 'form_updated', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(10);

    let expectedScopes = {
      create_form: googleFormsActionScopes.createForm,
      get_form: googleFormsActionScopes.getForm,
      update_form: googleFormsActionScopes.updateForm,
      set_publish_settings: googleFormsActionScopes.setPublishSettings,
      get_response: googleFormsActionScopes.getResponse,
      list_responses: googleFormsActionScopes.listResponses,
      manage_watches: googleFormsActionScopes.manageWatches,
      inbound_webhook: googleFormsActionScopes.inboundWebhook,
      new_response: googleFormsActionScopes.newResponse,
      form_updated: googleFormsActionScopes.formUpdated
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Forms (Full)')).toBe(true);
    expect(scopeTitles.has('User Email')).toBe(true);
  });
});
