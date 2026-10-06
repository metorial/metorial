import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Sanity tool input schemas', provider.actions);
const legacy = {
  get_document: ['documentId', 'documentIds', 'revision', 'time'],
  query_documents: ['query', 'params', 'perspective', 'useCdn'],
  mutate_documents: ['mutations', 'returnDocuments', 'dryRun', 'autoGenerateArrayKeys'],
  list_projects: ['projectId'],
  manage_datasets: ['action', 'datasetName', 'aclMode'],
  manage_webhooks: [
    'action',
    'webhookId',
    'webhookName',
    'targetUrl',
    'targetDataset',
    'rule',
    'httpMethod',
    'secret',
    'customHeaders',
    'includeDrafts'
  ],
  upload_asset: ['assetType', 'contentBase64', 'filename', 'contentType']
};
describe('Legacy Sanity contracts', () => {
  for (const [key, fields] of Object.entries(legacy))
    it(`retains ${key} fields`, () => {
      const action = provider.actions.find(tool => tool.key === key);
      expect(action).toBeDefined();
      const schema = z.toJSONSchema(action!.inputSchema) as {
        properties: Record<string, unknown>;
      };
      for (const field of fields) expect(schema.properties).toHaveProperty(field);
    });
  it('retains perspective and ACL enum values', () => {
    expect(
      provider.actions
        .find(tool => tool.key === 'query_documents')!
        .inputSchema.safeParse({ query: '*[]', perspective: 'previewDrafts' }).success
    ).toBe(true);
    expect(
      provider.actions
        .find(tool => tool.key === 'manage_datasets')!
        .inputSchema.safeParse({
          action: 'create',
          datasetName: 'controlled',
          aclMode: 'custom'
        }).success
    ).toBe(true);
  });
  it('keeps production tool IDs below the bridge limit', () => {
    for (const action of provider.actions)
      expect(`sanity-${action.key}`.length).toBeLessThan(60);
  });
  it('registers exactly the bounded nine public keys', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      [...Object.keys(legacy), 'get_current_user', 'download_asset'].sort()
    );
  });
});
