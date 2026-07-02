import {
  createLocalSlateTestClient,
  describeMcpCompatibleToolSchemas,
  expectSlateContract
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { gmailActionScopes, gmailScopes } from './scopes';

describe('gmail provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'gmail',
        name: 'Gmail'
      },
      toolIds: [
        'send_email',
        'search_messages',
        'get_message',
        'modify_message',
        'delete_messages_permanently',
        'manage_draft',
        'manage_labels',
        'manage_thread',
        'delete_thread_permanently',
        'manage_settings',
        'get_attachment',
        'list_google_contacts',
        'search_google_contacts',
        'get_google_contact'
      ],
      triggerIds: ['inbound_webhook', 'mailbox_changes'],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'send_email', readOnly: false, destructive: false },
        { id: 'search_messages', readOnly: true, destructive: false },
        { id: 'get_message', readOnly: true, destructive: false },
        { id: 'modify_message', readOnly: false, destructive: true },
        { id: 'delete_messages_permanently', readOnly: false, destructive: true },
        { id: 'manage_draft', readOnly: false, destructive: false },
        { id: 'manage_labels', readOnly: false, destructive: false },
        { id: 'manage_thread', readOnly: false, destructive: false },
        { id: 'delete_thread_permanently', readOnly: false, destructive: true },
        { id: 'manage_settings', readOnly: false, destructive: false },
        { id: 'get_attachment', readOnly: true, destructive: false },
        { id: 'list_google_contacts', readOnly: true, destructive: false },
        { id: 'search_google_contacts', readOnly: true, destructive: false },
        { id: 'get_google_contact', readOnly: true, destructive: false }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'mailbox_changes', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(16);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual(['userId']);

    let expectedScopes = {
      send_email: gmailActionScopes.sendEmail,
      search_messages: gmailActionScopes.searchMessages,
      get_message: gmailActionScopes.getMessage,
      modify_message: gmailActionScopes.modifyMessage,
      delete_messages_permanently: gmailActionScopes.deleteMessagesPermanently,
      manage_draft: gmailActionScopes.manageDraft,
      manage_labels: gmailActionScopes.manageLabels,
      manage_thread: gmailActionScopes.manageThread,
      delete_thread_permanently: gmailActionScopes.deleteThreadPermanently,
      manage_settings: gmailActionScopes.manageSettings,
      get_attachment: gmailActionScopes.getAttachment,
      list_google_contacts: gmailActionScopes.listGoogleContacts,
      search_google_contacts: gmailActionScopes.searchGoogleContacts,
      get_google_contact: gmailActionScopes.getGoogleContact,
      mailbox_changes: gmailActionScopes.mailboxChanges
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }
    expect(
      contract.actions.find(action => action.id === 'inbound_webhook')?.scopes
    ).toBeUndefined();

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Read-Only')).toBe(true);
    expect(scopeTitles.has('Full Access')).toBe(true);
    expect(scopeTitles.has('User Profile')).toBe(true);

    let contactScope = (oauth.authenticationMethod.scopes ?? []).find(
      scope => scope.id === gmailScopes.contactsReadonly
    );
    expect(contactScope).toMatchObject({
      title: 'Google Contacts (Read-only)',
      defaultChecked: true
    });

    let otherContactScope = (oauth.authenticationMethod.scopes ?? []).find(
      scope => scope.id === gmailScopes.contactsOtherReadonly
    );
    expect(otherContactScope).toMatchObject({
      title: 'Google Other Contacts (Read-only)',
      defaultChecked: false
    });
  });

  it('exposes exact Gmail scopes for sensitive action groups', () => {
    let expectedReadBodyScopes = {
      AND: [
        {
          OR: [gmailScopes.gmailReadonly, gmailScopes.gmailModify, gmailScopes.fullMail]
        }
      ]
    };
    let expectedDraftScopes = {
      AND: [
        {
          OR: [gmailScopes.gmailCompose, gmailScopes.gmailModify, gmailScopes.fullMail]
        }
      ]
    };
    let expectedModifyScopes = {
      AND: [
        {
          OR: [gmailScopes.gmailModify, gmailScopes.fullMail]
        }
      ]
    };
    let expectedSettingsScopes = {
      AND: [
        {
          OR: [gmailScopes.gmailSettingsBasic]
        }
      ]
    };
    let expectedPermanentDeleteScopes = {
      AND: [
        {
          OR: [gmailScopes.fullMail]
        }
      ]
    };

    expect(gmailActionScopes.searchMessages).toEqual(expectedReadBodyScopes);
    expect(gmailActionScopes.getMessage).toEqual(expectedReadBodyScopes);
    expect(gmailActionScopes.getAttachment).toEqual(expectedReadBodyScopes);
    expect(gmailActionScopes.manageDraft).toEqual(expectedDraftScopes);
    expect(gmailActionScopes.manageSettings).toEqual(expectedSettingsScopes);
    expect(gmailActionScopes.modifyMessage).toEqual(expectedModifyScopes);
    expect(gmailActionScopes.manageThread).toEqual(expectedModifyScopes);
    expect(gmailActionScopes.deleteMessagesPermanently).toEqual(expectedPermanentDeleteScopes);
    expect(gmailActionScopes.deleteThreadPermanently).toEqual(expectedPermanentDeleteScopes);
  });
});

describeMcpCompatibleToolSchemas('Gmail tool input schemas', provider.actions);
