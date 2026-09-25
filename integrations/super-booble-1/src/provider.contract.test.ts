import { provider as gmailProvider } from '@slates-integrations/gmail';
import { provider as googleChatProvider } from '@slates-integrations/google-chat';
import { provider as googleContactsProvider } from '@slates-integrations/google-contacts';
import { provider as googleDocsProvider } from '@slates-integrations/google-docs';
import { provider as googleDriveProvider } from '@slates-integrations/google-drive';
import { provider as googleSheetsProvider } from '@slates-integrations/google-sheets';
import { describe, expect, it } from 'vitest';
import { provider, superGoogle1ToolInventory } from './index';
import {
  superGoogle1OAuthScopes,
  superGoogle1ProfileScopes,
  superGoogle1RestrictedScopes,
  superGoogle1ScopeEnvelope,
  superGoogle1SensitiveScopes
} from './scopes';
import { superGoogle1ExpectedToolKeys, superGoogle1ToolManifest } from './tool-manifest';

let sourceProviders = new Map<string, { actions: readonly any[] }>([
  ['gmail', gmailProvider],
  ['google-drive', googleDriveProvider],
  ['google-docs', googleDocsProvider],
  ['google-sheets', googleSheetsProvider],
  ['google-chat', googleChatProvider],
  ['google-contacts', googleContactsProvider]
]);

let sourceToolsFor = (sourceIntegration: string) =>
  sourceProviders.get(sourceIntegration)!.actions.filter(action => action.type === 'tool');

let scope = (name: string) =>
  name === 'mail' ? 'https://mail.google.com/' : `https://www.googleapis.com/auth/${name}`;

type ScopedAction = { scopes?: { AND: { OR: string[] }[] } };

let satisfiedBy = (action: ScopedAction, grants: ReadonlySet<string>) =>
  action.scopes?.AND.every(clause => clause.OR.some(granted => grants.has(granted))) ?? true;

let mentionedScopes = (action: ScopedAction) =>
  new Set((action.scopes?.AND ?? []).flatMap(clause => clause.OR));

let oauthGrant: ReadonlySet<string> = new Set(
  superGoogle1OAuthScopes.map(entry => entry.scope)
);
let grantsByAuthMethod = new Map<string, ReadonlySet<string>>([['oauth', oauthGrant]]);

// Only the read-only variants from the envelope, plus the profile scopes. Read tools must
// work with this grant alone so broader grants cannot hide an over-strict scope clause.
let readOnlyOAuthGrant: ReadonlySet<string> = new Set(
  [...oauthGrant].filter(
    granted => granted.endsWith('.readonly') || superGoogle1ProfileScopes.has(granted)
  )
);

describe('Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 1 provider contract', () => {
  it('exposes the exact 77-tool manifest without triggers', () => {
    expect(sourceToolsFor('gmail')).toHaveLength(18);
    expect(sourceToolsFor('google-drive')).toHaveLength(29);
    expect(sourceToolsFor('google-docs')).toHaveLength(8);
    expect(sourceToolsFor('google-sheets')).toHaveLength(17);
    expect(sourceToolsFor('google-chat')).toHaveLength(25);
    expect(sourceToolsFor('google-contacts')).toHaveLength(19);
    expect(superGoogle1ToolManifest).toHaveLength(116);
    expect(superGoogle1ExpectedToolKeys).toHaveLength(77);
    expect(provider.actions.map(action => action.key)).toEqual(superGoogle1ExpectedToolKeys);
    expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
    expect(superGoogle1ToolInventory.sourceToolCount).toBe(116);
    expect(superGoogle1ToolInventory.importedToolCount).toBe(77);
  });

  it('does not import Google Meet, which belongs to the sensitive-scope project', () => {
    expect(
      superGoogle1ToolManifest.some(entry => entry.sourceIntegration === 'google-meet')
    ).toBe(false);
    expect(provider.actions.map(action => action.key)).not.toContain('create_space');
    for (let scope of superGoogle1ScopeEnvelope) {
      expect(scope).not.toContain('meetings.space');
    }
    expect(
      superGoogle1ScopeEnvelope.has('https://www.googleapis.com/auth/drive.meet.readonly')
    ).toBe(false);
  });

  it('retains aliases, Gmail attachments, and only the Drive-backed Docs and Sheets tools', () => {
    expect(
      superGoogle1ToolInventory.renamed.map(entry => [
        entry.sourceIntegration,
        entry.sourceKey,
        entry.exposedKey
      ])
    ).toEqual([
      ['gmail', 'search_messages', 'gmail_search_messages'],
      ['google-chat', 'search_messages', 'chat_search_messages']
    ]);
    let keys = provider.actions.map(action => action.key);
    expect(keys).toContain('get_attachment');
    expect(
      superGoogle1ToolInventory.included
        .filter(entry => entry.sourceIntegration === 'google-docs')
        .map(entry => entry.sourceKey)
    ).toEqual(['create_document_markdown', 'list_documents', 'update_document_markdown']);
    expect(
      superGoogle1ToolInventory.included
        .filter(entry => entry.sourceIntegration === 'google-sheets')
        .map(entry => entry.sourceKey)
    ).toEqual(['delete_spreadsheet']);
    expect(
      superGoogle1ToolInventory.included
        .filter(entry => entry.sourceIntegration === 'google-contacts')
        .map(entry => entry.sourceKey)
    ).toEqual(['list_other_contacts', 'search_other_contacts']);
  });

  it('reports every approved omission and no implicit omissions', () => {
    expect(
      superGoogle1ToolInventory.omitted.map(entry => [
        entry.sourceIntegration,
        entry.sourceKey
      ])
    ).toEqual([
      ['google-docs', 'create_document'],
      ['google-docs', 'get_document'],
      ['google-docs', 'edit_document'],
      ['google-docs', 'merge_template'],
      ['google-docs', 'manage_named_ranges'],
      ['google-sheets', 'create_spreadsheet'],
      ['google-sheets', 'get_spreadsheet'],
      ['google-sheets', 'update_spreadsheet'],
      ['google-sheets', 'read_cells'],
      ['google-sheets', 'write_cells'],
      ['google-sheets', 'clear_cells'],
      ['google-sheets', 'manage_sheets'],
      ['google-sheets', 'format_cells'],
      ['google-sheets', 'create_chart'],
      ['google-sheets', 'create_pivot_table'],
      ['google-sheets', 'set_data_validation'],
      ['google-sheets', 'manage_protected_ranges'],
      ['google-sheets', 'create_filter_view'],
      ['google-sheets', 'merge_cells'],
      ['google-sheets', 'batch_update'],
      ['google-sheets', 'manage_named_ranges'],
      ['google-chat', 'get_attachment'],
      ['google-contacts', 'create_contact'],
      ['google-contacts', 'get_contact'],
      ['google-contacts', 'update_contact'],
      ['google-contacts', 'delete_contact'],
      ['google-contacts', 'list_contacts'],
      ['google-contacts', 'search_contacts'],
      ['google-contacts', 'create_contact_group'],
      ['google-contacts', 'update_contact_group'],
      ['google-contacts', 'delete_contact_group'],
      ['google-contacts', 'list_contact_groups'],
      ['google-contacts', 'get_contact_group'],
      ['google-contacts', 'modify_group_members'],
      ['google-contacts', 'copy_other_contact'],
      ['google-contacts', 'search_directory'],
      ['google-contacts', 'get_my_profile'],
      ['google-contacts', 'manage_contact_photo'],
      ['google-contacts', 'batch_modify_contacts']
    ]);
    expect(superGoogle1ToolInventory.omitted.every(entry => entry.reason.length > 0)).toBe(
      true
    );
    expect(superGoogle1ToolInventory.included).toHaveLength(77);
  });

  it('omits the saved-contact tools that duplicate Gmail contact lookup', () => {
    let keys = provider.actions.map(action => action.key);
    for (let key of ['list_google_contacts', 'search_google_contacts', 'get_google_contact']) {
      expect(keys).toContain(key);
    }
    for (let key of ['list_contacts', 'search_contacts', 'get_contact']) {
      expect(keys).not.toContain(key);
    }
  });

  it('preserves source contracts while rebinding auth methods', () => {
    for (let included of superGoogle1ToolInventory.included) {
      let sourceTool = sourceToolsFor(included.sourceIntegration).find(
        action => action.key === included.sourceKey
      );
      let importedTool = provider.actions.find(action => action.key === included.exposedKey);
      let manifestEntry = superGoogle1ToolManifest.find(
        entry =>
          entry.sourceIntegration === included.sourceIntegration &&
          entry.sourceKey === included.sourceKey
      );
      let includedEntry = manifestEntry?.status !== 'omitted' ? manifestEntry : undefined;

      expect(sourceTool).toBeDefined();
      expect(importedTool).toBeDefined();
      expect(includedEntry).toBeDefined();
      expect(importedTool?.name).toBe(sourceTool?.name);
      expect(importedTool?.description).toBe(sourceTool?.description);
      expect(importedTool?.instructions).toBe(
        includedEntry?.instructions ?? sourceTool?.instructions
      );
      expect(importedTool?.constraints).toBe(
        includedEntry?.constraints ?? sourceTool?.constraints
      );
      expect(importedTool?.tags).toBe(sourceTool?.tags);
      expect(importedTool?.metadata).toBe(sourceTool?.metadata);
      expect(importedTool?.docs).toBe(sourceTool?.docs);
      expect(importedTool?.scopes).toBe(includedEntry?.scopes ?? sourceTool?.scopes);
      expect(importedTool?.inputSchema).toBe(sourceTool?.inputSchema);
      expect(importedTool?.outputSchema).toBe(sourceTool?.outputSchema);
      expect(importedTool?.authMethods, included.exposedKey).toEqual(['oauth']);
    }
  });

  it('does not expose source instructions that contradict the aggregate inventory or OAuth grant', () => {
    for (let key of [
      'create_document_markdown',
      'update_document_markdown',
      'list_documents',
      'delete_spreadsheet'
    ]) {
      let tool = provider.actions.find(action => action.key === key);
      let publicGuidance = JSON.stringify([
        tool?.parameters.instructions,
        tool?.parameters.constraints
      ]).toLowerCase();
      expect(publicGuidance, key).not.toContain('drive.file');
      expect(publicGuidance, key).not.toContain('create_document');
      expect(publicGuidance, key).not.toContain('edit_document');
    }
  });

  it('keeps aggregate tool keys unique and production IDs under 60 characters', () => {
    let keys = provider.actions.map(action => action.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (let key of keys) {
      expect(`super-booble-1-${key}`.length).toBeLessThan(60);
    }
  });

  it('mirrors the P1 Console declaration: 13 restricted and 25 sensitive scopes', () => {
    expect(superGoogle1RestrictedScopes).toHaveLength(13);
    expect(superGoogle1SensitiveScopes).toHaveLength(25);
    expect(superGoogle1ScopeEnvelope.size).toBe(38);
    // The Console rejects chat.import as an invalid user OAuth scope.
    expect(superGoogle1ScopeEnvelope.has('https://www.googleapis.com/auth/chat.import')).toBe(
      false
    );
    expect(superGoogle1SensitiveScopes).toContain(
      'https://www.googleapis.com/auth/chat.users.sections'
    );
    expect(superGoogle1ScopeEnvelope.has('https://www.googleapis.com/auth/chat.bot')).toBe(
      false
    );
  });

  it('requests only user-usable P1 scopes in Console order', () => {
    let declared: string[] = superGoogle1OAuthScopes.map(scope => scope.scope);
    let declaredScopes = new Set(declared);
    expect(declaredScopes.size).toBe(superGoogle1OAuthScopes.length);
    expect(declared).toEqual([
      ...superGoogle1RestrictedScopes,
      ...superGoogle1SensitiveScopes
    ]);
    expect(declared).toHaveLength(38);
    expect(declaredScopes.has(scope('gmail.settings.sharing'))).toBe(false);
    expect(declaredScopes.has(scope('drive.labels'))).toBe(false);
    expect(declaredScopes).toEqual(superGoogle1ScopeEnvelope);

    for (let descriptor of superGoogle1OAuthScopes) {
      expect(descriptor.title.trim().length, descriptor.scope).toBeGreaterThan(0);
      expect(descriptor.description.trim().length, descriptor.scope).toBeGreaterThan(0);
    }
    expect(declaredScopes.has('https://www.googleapis.com/auth/chat.bot')).toBe(false);
    expect(declaredScopes.has('https://www.googleapis.com/auth/meetings.space.created')).toBe(
      false
    );
    expect(declaredScopes.has('https://www.googleapis.com/auth/drive.meet.readonly')).toBe(
      false
    );
  });

  it('backs every requested scope with a tool available to that auth method', () => {
    for (let [authMethod, grants] of grantsByAuthMethod) {
      let tools = provider.actions.filter(action => action.authMethods?.includes(authMethod));
      let usedScopes = new Set(tools.flatMap(action => [...mentionedScopes(action)]));
      for (let granted of grants) {
        expect(
          superGoogle1ScopeEnvelope.has(granted),
          `Unexpected scope for ${authMethod}: ${granted}`
        ).toBe(true);
        let usedByProfile = authMethod === 'oauth' && superGoogle1ProfileScopes.has(granted);
        expect(
          usedScopes.has(granted) || usedByProfile,
          `Unused scope for ${authMethod}: ${granted}`
        ).toBe(true);
      }
    }
  });

  it('maps each formerly unused declared scope to the tools that now use it', () => {
    let expectedUsers: [string, string[]][] = [
      ['gmail.insert', ['import_message', 'insert_message']],
      ['contacts.other.readonly', ['list_other_contacts', 'search_other_contacts']],
      ['chat.admin.spaces.readonly', ['search_spaces_admin']],
      ['chat.customemojis', ['list_custom_emojis', 'get_custom_emoji', 'manage_custom_emoji']],
      ['chat.customemojis.readonly', ['list_custom_emojis', 'get_custom_emoji']],
      [
        'chat.users.sections',
        ['list_sections', 'list_section_items', 'manage_section', 'move_section_item']
      ],
      ['chat.users.sections.readonly', ['list_sections', 'list_section_items']],
      [
        'chat.users.readstate',
        ['get_space_read_state', 'get_thread_read_state', 'update_space_read_state']
      ],
      ['chat.users.readstate.readonly', ['get_space_read_state', 'get_thread_read_state']],
      [
        'chat.users.spacesettings',
        ['get_space_notification_setting', 'update_space_notification_setting']
      ],
      ['drive.apps.readonly', ['list_drive_apps', 'get_drive_app']],
      ['drive.labels.readonly', ['list_drive_labels', 'get_drive_label']],
      // Formerly a supplemental mapping; the source manage_space clause now lists it.
      ['chat.delete', ['manage_space']]
    ];

    for (let [name, keys] of expectedUsers) {
      let users = provider.actions
        .filter(action => mentionedScopes(action).has(scope(name)))
        .map(action => action.key);
      expect(users, name).toEqual(keys);
    }
  });

  it('keeps every imported tool satisfiable by each auth method it is bound to', () => {
    // Source clauses may list scopes the aggregate never requests (docs,
    // chat.admin.spaces, chat.bot); that is fine as long as every AND clause still has an
    // OR option inside the grant of each bound auth method.
    for (let action of provider.actions) {
      for (let authMethod of action.authMethods ?? []) {
        let grant = grantsByAuthMethod.get(authMethod);
        expect(
          grant,
          `${action.key} is bound to unknown auth method ${authMethod}`
        ).toBeDefined();
        expect(satisfiedBy(action, grant!), `${action.key} under ${authMethod}`).toBe(true);
      }
    }
  });

  it('lets read tools run on read-only grants and keeps write tools off them', () => {
    // Google offers no read-only variant of chat.users.spacesettings. list_documents is
    // pinned to the full drive scope by the aggregate manifest override.
    let readToolsWithoutReadOnlyScope = ['list_documents', 'get_space_notification_setting'];
    // Consolidated tools whose get/list actions accept read-only scopes; their write
    // actions report a missing grant at runtime.
    let writeToolsWithReadActions = ['manage_space', 'manage_message'];

    for (let action of provider.actions) {
      if (!action.authMethods?.includes('oauth')) continue;
      let readOnly = action.tags?.readOnly === true;
      let satisfied = satisfiedBy(action, readOnlyOAuthGrant);

      if (readOnly) {
        expect(satisfied, `${action.key} needs more than read-only scopes`).toBe(
          !readToolsWithoutReadOnlyScope.includes(action.key)
        );
      } else {
        expect(satisfied, `${action.key} is satisfiable by read-only scopes`).toBe(
          writeToolsWithReadActions.includes(action.key)
        );
      }
    }
  });

  it('lets each newly covered read tool run on its read-only scope alone', () => {
    let readTools: [string, string][] = [
      ['list_other_contacts', 'contacts.other.readonly'],
      ['search_other_contacts', 'contacts.other.readonly'],
      ['search_spaces_admin', 'chat.admin.spaces.readonly'],
      ['list_custom_emojis', 'chat.customemojis.readonly'],
      ['get_custom_emoji', 'chat.customemojis.readonly'],
      ['list_sections', 'chat.users.sections.readonly'],
      ['list_section_items', 'chat.users.sections.readonly'],
      ['get_space_read_state', 'chat.users.readstate.readonly'],
      ['get_thread_read_state', 'chat.users.readstate.readonly'],
      ['list_drive_apps', 'drive.apps.readonly'],
      ['get_drive_app', 'drive.apps.readonly'],
      ['list_drive_labels', 'drive.labels.readonly'],
      ['get_drive_label', 'drive.labels.readonly']
    ];
    for (let [key, name] of readTools) {
      let tool = provider.actions.find(action => action.key === key);
      expect(tool, key).toBeDefined();
      expect(satisfiedBy(tool!, new Set([scope(name)])), key).toBe(true);
    }

    let writeTools: [string, string, string][] = [
      ['manage_custom_emoji', 'chat.customemojis.readonly', 'chat.customemojis'],
      ['manage_section', 'chat.users.sections.readonly', 'chat.users.sections'],
      ['move_section_item', 'chat.users.sections.readonly', 'chat.users.sections'],
      ['update_space_read_state', 'chat.users.readstate.readonly', 'chat.users.readstate'],
      ['import_message', 'gmail.readonly', 'gmail.insert'],
      ['insert_message', 'gmail.readonly', 'gmail.insert']
    ];
    for (let [key, readScope, writeScope] of writeTools) {
      let tool = provider.actions.find(action => action.key === key);
      expect(tool, key).toBeDefined();
      expect(satisfiedBy(tool!, new Set([scope(readScope)])), key).toBe(false);
      expect(satisfiedBy(tool!, new Set([scope(writeScope)])), key).toBe(true);
    }
  });
});
