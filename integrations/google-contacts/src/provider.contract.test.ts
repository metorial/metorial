import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleContactsActionScopes, googleContactsScopes } from './scopes';

describe('google-contacts provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-contacts',
        name: 'Google Contacts'
      },
      toolIds: [
        'create_contact',
        'get_contact',
        'update_contact',
        'delete_contact',
        'list_contacts',
        'search_contacts',
        'create_contact_group',
        'update_contact_group',
        'delete_contact_group',
        'list_contact_groups',
        'get_contact_group',
        'modify_group_members',
        'list_other_contacts',
        'search_other_contacts',
        'copy_other_contact',
        'search_directory',
        'get_my_profile',
        'manage_contact_photo',
        'batch_modify_contacts'
      ],
      triggerIds: ['inbound_webhook', 'contact_changed'],
      authMethodIds: ['google_oauth', 'api_key'],
      tools: [
        { id: 'create_contact', readOnly: false, destructive: false },
        { id: 'get_contact', readOnly: true, destructive: false },
        { id: 'update_contact', readOnly: false, destructive: false },
        { id: 'delete_contact', readOnly: false, destructive: true },
        { id: 'list_contacts', readOnly: true, destructive: false },
        { id: 'search_contacts', readOnly: true, destructive: false },
        { id: 'create_contact_group', readOnly: false, destructive: false },
        { id: 'update_contact_group', readOnly: false, destructive: false },
        { id: 'delete_contact_group', readOnly: false, destructive: true },
        { id: 'list_contact_groups', readOnly: true, destructive: false },
        { id: 'get_contact_group', readOnly: true, destructive: false },
        { id: 'modify_group_members', readOnly: false, destructive: false },
        { id: 'list_other_contacts', readOnly: true, destructive: false },
        { id: 'search_other_contacts', readOnly: true, destructive: false },
        { id: 'copy_other_contact', readOnly: false, destructive: false },
        { id: 'search_directory', readOnly: true, destructive: false },
        { id: 'get_my_profile', readOnly: true, destructive: false },
        { id: 'manage_contact_photo', readOnly: false, destructive: true },
        { id: 'batch_modify_contacts', readOnly: false, destructive: true }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'contact_changed', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(21);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([]);

    let expectedScopes = {
      create_contact: googleContactsActionScopes.createContact,
      get_contact: googleContactsActionScopes.getContact,
      update_contact: googleContactsActionScopes.updateContact,
      delete_contact: googleContactsActionScopes.deleteContact,
      list_contacts: googleContactsActionScopes.listContacts,
      search_contacts: googleContactsActionScopes.searchContacts,
      create_contact_group: googleContactsActionScopes.createContactGroup,
      update_contact_group: googleContactsActionScopes.updateContactGroup,
      delete_contact_group: googleContactsActionScopes.deleteContactGroup,
      list_contact_groups: googleContactsActionScopes.listContactGroups,
      get_contact_group: googleContactsActionScopes.getContactGroup,
      modify_group_members: googleContactsActionScopes.modifyGroupMembers,
      list_other_contacts: googleContactsActionScopes.listOtherContacts,
      search_other_contacts: googleContactsActionScopes.searchOtherContacts,
      copy_other_contact: googleContactsActionScopes.copyOtherContact,
      search_directory: googleContactsActionScopes.searchDirectory,
      get_my_profile: googleContactsActionScopes.getMyProfile,
      manage_contact_photo: googleContactsActionScopes.manageContactPhoto,
      batch_modify_contacts: googleContactsActionScopes.batchModifyContacts,
      inbound_webhook: googleContactsActionScopes.inboundWebhook,
      contact_changed: googleContactsActionScopes.contactChanged
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Contacts (Read-only)')).toBe(true);
    expect(scopeTitles.has('Directory (Read-only)')).toBe(true);

    let otherContactScope = (oauth.authenticationMethod.scopes ?? []).find(
      scope => scope.id === googleContactsScopes.contactsOtherReadonly
    );
    expect(otherContactScope).toMatchObject({
      title: 'Other Contacts (Read-only)'
    });

    let apiKey = await client.getAuthMethod('api_key');
    expect(apiKey.authenticationMethod.type).toBe('auth.token');
  });
});
