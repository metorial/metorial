import {
  createLocalSlateTestClient,
  describeMcpCompatibleToolSchemas,
  expectSlateContract
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleDocsActionScopes, googleDocsScopes } from './scopes';

describe('google-docs provider contract', () => {
  it('preserves the existing surface and exposes the Markdown conversion tools', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-docs',
        name: 'Google Docs',
        description:
          'Create, read, edit, and format Google Docs documents. Insert and style text, manage tables, add images, create bulleted and numbered lists, and apply paragraph formatting. Use named ranges for template merging and dynamic content generation. Access document structure including headers, footers, and multiple tabs.'
      },
      toolIds: [
        'create_document',
        'create_document_markdown',
        'get_document',
        'edit_document',
        'merge_template',
        'list_documents',
        'manage_named_ranges',
        'update_document_markdown'
      ],
      triggerIds: ['inbound_webhook', 'document_changed'],
      authMethodIds: ['google_oauth'],
      tools: [
        { id: 'create_document', readOnly: false, destructive: false },
        { id: 'create_document_markdown', readOnly: false, destructive: false },
        { id: 'get_document', readOnly: true, destructive: false },
        { id: 'edit_document', readOnly: false, destructive: true },
        { id: 'merge_template', readOnly: false, destructive: true },
        { id: 'list_documents', readOnly: true, destructive: false },
        { id: 'manage_named_ranges', readOnly: false, destructive: true },
        { id: 'update_document_markdown', readOnly: false, destructive: true }
      ],
      triggers: [
        { id: 'inbound_webhook', invocationType: 'webhook' },
        { id: 'document_changed', invocationType: 'polling' }
      ]
    });

    expect(contract.actions).toHaveLength(10);

    let expectedScopes = {
      create_document: googleDocsActionScopes.createDocument,
      create_document_markdown: googleDocsActionScopes.createDocumentMarkdown,
      get_document: googleDocsActionScopes.getDocument,
      edit_document: googleDocsActionScopes.editDocument,
      merge_template: googleDocsActionScopes.mergeTemplate,
      list_documents: googleDocsActionScopes.listDocuments,
      manage_named_ranges: googleDocsActionScopes.manageNamedRanges,
      update_document_markdown: googleDocsActionScopes.updateDocumentMarkdown,
      inbound_webhook: googleDocsActionScopes.inboundWebhook,
      document_changed: googleDocsActionScopes.documentChanged
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('google_oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    let driveFileScope = oauth.authenticationMethod.scopes?.find(
      scope => scope.title === 'Drive File'
    );
    expect(driveFileScope).toMatchObject({
      id: googleDocsScopes.driveFile
    });

    expect('google-docs-create_document_markdown'.length).toBeLessThan(60);
    expect('google-docs-update_document_markdown'.length).toBeLessThan(60);
  });
});

describeMcpCompatibleToolSchemas('Google Docs tool input schemas', provider.actions);
