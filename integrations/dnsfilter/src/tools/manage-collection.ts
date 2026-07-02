import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, update, delete, or list user collections. Collections group users for policy assignment with priority ordering. If a user belongs to multiple collections, the highest-priority collection's policy applies.
- **list**: Get all collections.
- **create**: Create a new collection.
- **update**: Modify collection settings.
- **delete**: Remove a collection.`
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID (required for update/delete)'),
      name: z.string().optional().describe('Collection name (for create/update)'),
      policyId: z.string().optional().describe('Policy ID to assign (for create/update)'),
      priority: z.number().optional().describe('Priority ordering (for create/update)'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional collection attributes')
    })
  )
  .output(
    z.object({
      collections: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of collections (for list)'),
      collection: z
        .record(z.string(), z.any())
        .optional()
        .describe('Collection details (for create/update)'),
      deleted: z.boolean().optional().describe('Whether the collection was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, collectionId } = ctx.input;

    if (action === 'list') {
      let collections = await client.listCollections();
      return {
        output: { collections },
        message: `Found **${collections.length}** collection(s).`
      };
    }

    if (action === 'delete') {
      if (!collectionId) throw new Error('collectionId is required for delete');
      await client.deleteCollection(collectionId);
      return {
        output: { deleted: true },
        message: `Deleted collection **${collectionId}**.`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.name) params.name = ctx.input.name;
    if (ctx.input.policyId) params.policy_id = ctx.input.policyId;
    if (ctx.input.priority !== undefined) params.priority = ctx.input.priority;
    if (ctx.input.attributes) Object.assign(params, ctx.input.attributes);

    if (action === 'create') {
      let collection = await client.createCollection(params);
      return {
        output: { collection },
        message: `Created collection **${collection.name ?? 'new collection'}**.`
      };
    }

    if (!collectionId) throw new Error('collectionId is required for update');
    let collection = await client.updateCollection(collectionId, params);
    return {
      output: { collection },
      message: `Updated collection **${collection.name ?? collectionId}**.`
    };
  })
  .build();
