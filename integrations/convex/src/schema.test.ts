import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import {
  generateUploadUrl,
  getDocumentDeltas,
  listDocuments,
  manageEnvironmentVariables
} from './tools';

describeMcpCompatibleToolSchemas('Convex tool input schemas', provider.actions);
it('retains every original tool and adds only deployment identity and file downloads', () => {
  expect(provider.actions).toHaveLength(9);
  for (const key of [
    'run_query',
    'run_mutation',
    'run_action',
    'list_documents',
    'get_document_deltas',
    'manage_environment_variables',
    'generate_upload_url'
  ])
    expect(provider.actions.some(tool => tool.key === key)).toBe(true);
  for (const tool of provider.actions) expect(`convex-${tool.key}`.length).toBeLessThan(60);
});
it('keeps legacy optional export fields and string cursor output contracts', () => {
  expect(listDocuments.inputSchema.safeParse({}).success).toBe(true);
  expect(getDocumentDeltas.inputSchema.safeParse({}).success).toBe(true);
  expect(z.toJSONSchema(listDocuments.outputSchema).properties?.cursor).toMatchObject({
    type: 'string'
  });
  expect(z.toJSONSchema(listDocuments.outputSchema).properties?.snapshotId).toMatchObject({
    type: 'string'
  });
  expect(z.toJSONSchema(getDocumentDeltas.outputSchema).properties?.cursor).toMatchObject({
    type: 'string'
  });
});
it('adds optional deployed upload function fields without rejecting the legacy empty input shape', () => {
  expect(generateUploadUrl.inputSchema.safeParse({}).success).toBe(true);
  expect(
    generateUploadUrl.inputSchema.safeParse({
      functionPath: 'files:generateUploadUrl',
      args: {}
    }).success
  ).toBe(true);
});
it('preserves string environment values and adds deletion by omitting a value', () => {
  expect(
    manageEnvironmentVariables.inputSchema.safeParse({
      changes: [{ name: 'TEST_VALUE', value: '' }]
    }).success
  ).toBe(true);
  expect(
    manageEnvironmentVariables.inputSchema.safeParse({ changes: [{ name: 'TEST_VALUE' }] })
      .success
  ).toBe(true);
});
