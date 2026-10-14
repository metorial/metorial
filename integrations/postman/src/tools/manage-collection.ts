import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollectionTool = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, update, or delete a Postman collection. When creating, provide the collection info and optionally a workspace ID. When updating, provide the full collection definition that will replace the existing one. When deleting, provide only the collection ID.`,
  instructions: [
    'When creating a collection, the schema field in info should be "https://schema.getpostman.com/json/collection/v2.1.0/collection.json".',
    'Updating replaces the entire collection — include the full definition. Pass get_collection output collection into definition to retain provider fields and structured descriptions.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      collectionId: z.string().optional().describe('Required for update and delete'),
      workspaceId: z.string().optional().describe('Workspace ID (used when creating)'),
      collection: z
        .object({
          info: z
            .object({
              name: z.string(),
              description: z.string().optional(),
              schema: z.string().optional()
            })
            .passthrough()
            .optional(),
          item: z.array(z.any()).optional(),
          variable: z.array(z.any()).optional(),
          auth: z.any().optional(),
          event: z
            .array(z.any())
            .optional()
            .describe('Collection-level pre-request and test scripts'),
          protocolProfileBehavior: z.record(z.string(), z.any()).optional()
        })
        .passthrough()
        .optional()
        .describe(
          'Collection definition for create and update; use either collection or definition'
        ),
      definition: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Complete collection JSON from get_collection; alternative to collection that preserves provider fields'
        )
    })
  )
  .output(
    z.object({
      collectionId: z.string().optional(),
      name: z.string().optional(),
      uid: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, collectionId, workspaceId } = ctx.input;
    if (ctx.input.collection && ctx.input.definition) {
      throw createApiServiceError('Provide either collection or definition, not both.');
    }
    let collection = ctx.input.definition ?? ctx.input.collection;

    if (action === 'create') {
      if (typeof collection?.info?.name !== 'string' || !collection.info.name.trim())
        throw createApiServiceError('Collection info with name is required for create.');
      let payload = {
        ...collection,
        info: {
          ...collection.info,
          schema:
            collection.info.schema ??
            'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: collection.item ?? [],
        variable: collection.variable,
        auth: collection.auth
      };
      let result = await client.createCollection(payload, workspaceId);
      return {
        output: { collectionId: result.id, name: result.name, uid: result.uid },
        message: `Created collection **"${result.name}"**.`
      };
    }

    if (action === 'update') {
      if (!collectionId) throw createApiServiceError('collectionId is required for update.');
      if (typeof collection?.info?.name !== 'string' || !collection.info.name.trim())
        throw createApiServiceError('Collection info with name is required for update.');
      let payload = {
        ...collection,
        info: collection.info
          ? {
              ...collection.info,
              schema:
                collection.info.schema ??
                'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            }
          : undefined,
        item: collection.item,
        variable: collection.variable,
        auth: collection.auth
      };
      let result = await client.updateCollection(collectionId, payload);
      return {
        output: { collectionId: result.id, name: result.name, uid: result.uid },
        message: `Updated collection **"${result.name}"**.`
      };
    }

    if (!collectionId) throw createApiServiceError('collectionId is required for delete.');
    let result = await client.deleteCollection(collectionId);
    return {
      output: { collectionId: result.id, name: undefined, uid: result.uid },
      message: `Deleted collection **${collectionId}**.`
    };
  })
  .build();
