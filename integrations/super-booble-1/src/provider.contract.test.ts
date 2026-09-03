import { provider as gmailProvider } from '@slates-integrations/gmail';
import { provider as googleChatProvider } from '@slates-integrations/google-chat';
import { provider as googleDocsProvider } from '@slates-integrations/google-docs';
import { provider as googleDriveProvider } from '@slates-integrations/google-drive';
import { provider as googleSheetsProvider } from '@slates-integrations/google-sheets';
import { describe, expect, it } from 'vitest';
import { provider, superGoogle1ToolInventory } from './index';
import {
  superGoogle1FutureToolScopes,
  superGoogle1OAuthScopes,
  superGoogle1ProfileScopes,
  superGoogle1RestrictedScopes,
  superGoogle1ScopeEnvelope,
  superGoogle1SensitiveScopes,
  superGoogle1SupplementalToolScopes
} from './scopes';
import { superGoogle1ExpectedToolKeys, superGoogle1ToolManifest } from './tool-manifest';

let sourceProviders = new Map<string, { actions: readonly any[] }>([
  ['gmail', gmailProvider],
  ['google-drive', googleDriveProvider],
  ['google-docs', googleDocsProvider],
  ['google-sheets', googleSheetsProvider],
  ['google-chat', googleChatProvider]
]);

let sourceToolsFor = (sourceIntegration: string) =>
  sourceProviders.get(sourceIntegration)!.actions.filter(action => action.type === 'tool');

describe('Super G̴͎̬̼̾̈́̍͠o̶͇͓̅̐̿o̷͍̓̓̄̚g̶͎̩̾̏l̸̛̬̓e̸̗̮͘ 1 provider contract', () => {
  it('exposes the exact 57-tool manifest without triggers', () => {
    expect(sourceToolsFor('gmail')).toHaveLength(16);
    expect(sourceToolsFor('google-drive')).toHaveLength(25);
    expect(sourceToolsFor('google-docs')).toHaveLength(8);
    expect(sourceToolsFor('google-sheets')).toHaveLength(17);
    expect(sourceToolsFor('google-chat')).toHaveLength(13);
    expect(superGoogle1ToolManifest).toHaveLength(79);
    expect(superGoogle1ExpectedToolKeys).toHaveLength(57);
    expect(provider.actions.map(action => action.key)).toEqual(superGoogle1ExpectedToolKeys);
    expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
    expect(superGoogle1ToolInventory.sourceToolCount).toBe(79);
    expect(superGoogle1ToolInventory.importedToolCount).toBe(57);
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
    expect(superGoogle1ToolInventory.renamed).toEqual([
      expect.objectContaining({
        sourceIntegration: 'gmail',
        sourceKey: 'search_messages',
        exposedKey: 'gmail_search_messages'
      }),
      expect.objectContaining({
        sourceIntegration: 'google-chat',
        sourceKey: 'search_messages',
        exposedKey: 'chat_search_messages'
      })
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
      ['google-chat', 'get_attachment']
    ]);
    expect(superGoogle1ToolInventory.omitted.every(entry => entry.reason.length > 0)).toBe(
      true
    );
    expect(superGoogle1ToolInventory.included).toHaveLength(57);
  });

  it('preserves source contracts while rebinding OAuth', () => {
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

      expect(sourceTool).toBeDefined();
      expect(importedTool).toBeDefined();
      expect(importedTool?.name).toBe(sourceTool?.name);
      expect(importedTool?.description).toBe(sourceTool?.description);
      expect(importedTool?.instructions).toBe(
        manifestEntry?.status !== 'omitted' && manifestEntry?.instructions
          ? manifestEntry.instructions
          : sourceTool?.instructions
      );
      expect(importedTool?.constraints).toBe(
        manifestEntry?.status !== 'omitted' && manifestEntry?.constraints
          ? manifestEntry.constraints
          : sourceTool?.constraints
      );
      expect(importedTool?.tags).toBe(sourceTool?.tags);
      expect(importedTool?.metadata).toBe(sourceTool?.metadata);
      expect(importedTool?.docs).toBe(sourceTool?.docs);
      expect(importedTool?.scopes).toBe(
        manifestEntry?.status !== 'omitted' && manifestEntry?.scopes
          ? manifestEntry.scopes
          : sourceTool?.scopes
      );
      expect(importedTool?.inputSchema).toBe(sourceTool?.inputSchema);
      expect(importedTool?.outputSchema).toBe(sourceTool?.outputSchema);
      expect(importedTool?.authMethods).toEqual(['oauth']);
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

  it('mirrors the P1 Console declaration: 14 restricted and 27 sensitive scopes', () => {
    expect(superGoogle1RestrictedScopes).toHaveLength(14);
    expect(superGoogle1SensitiveScopes).toHaveLength(27);
    expect(superGoogle1ScopeEnvelope.size).toBe(41);
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
    for (let scope of superGoogle1FutureToolScopes) {
      expect(superGoogle1ScopeEnvelope.has(scope), scope).toBe(true);
    }
  });

  it('requests the complete P1 declaration in Console order, future scopes included', () => {
    let declared: string[] = superGoogle1OAuthScopes.map(scope => scope.scope);
    let declaredScopes = new Set(declared);
    expect(declaredScopes.size).toBe(superGoogle1OAuthScopes.length);
    expect(declared).toEqual([
      ...superGoogle1RestrictedScopes,
      ...superGoogle1SensitiveScopes
    ]);
    expect(declared).toHaveLength(41);

    for (let descriptor of superGoogle1OAuthScopes) {
      expect(descriptor.title.trim().length, descriptor.scope).toBeGreaterThan(0);
      expect(descriptor.description.trim().length, descriptor.scope).toBeGreaterThan(0);
    }
    for (let scope of superGoogle1FutureToolScopes) {
      expect(declaredScopes.has(scope), scope).toBe(true);
    }
    expect(declaredScopes.has('https://www.googleapis.com/auth/chat.bot')).toBe(false);
    expect(declaredScopes.has('https://www.googleapis.com/auth/meetings.space.created')).toBe(
      false
    );
    expect(declaredScopes.has('https://www.googleapis.com/auth/drive.meet.readonly')).toBe(
      false
    );

    for (let action of provider.actions) {
      expect(
        action.scopes?.AND.every(clause =>
          clause.OR.some(scope => declaredScopes.has(scope))
        ) ?? true,
        action.key
      ).toBe(true);
    }

    // Every declared scope is either used by a retained tool, the profile lookup, a
    // supplemental action, or explicitly listed as a future-tool scope.
    let mentionedByTools = new Set<string>();
    for (let action of provider.actions) {
      for (let clause of action.scopes?.AND ?? []) {
        for (let scope of clause.OR) mentionedByTools.add(scope);
      }
    }
    let usedScopes = new Set<string>([
      ...mentionedByTools,
      ...superGoogle1ProfileScopes,
      ...superGoogle1SupplementalToolScopes.values(),
      ...superGoogle1FutureToolScopes
    ]);
    for (let scope of declaredScopes) {
      expect(usedScopes.has(scope), `Unaccounted declared scope ${scope}`).toBe(true);
    }
    for (let scope of superGoogle1FutureToolScopes) {
      expect(
        mentionedByTools.has(scope),
        `Future scope is already used by a tool and should leave the future list: ${scope}`
      ).toBe(false);
    }
  });
});
