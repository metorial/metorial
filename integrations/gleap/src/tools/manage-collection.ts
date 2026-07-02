import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Help Center Collection',
  key: 'manage_collection',
  description: `Create, update, or delete a help center collection (category). Collections organize help center articles into groups.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID (required for update and delete)'),
      title: z.string().optional().describe('Collection title (required for create)'),
      description: z.string().optional().describe('Collection description'),
      iconUrl: z.string().optional().describe('URL for the collection icon'),
      parentId: z.string().optional().describe('Parent collection ID for nesting'),
      targetAudience: z.string().optional().describe('Target audience (default: all)')
    })
  )
  .output(
    z.object({
      collection: z
        .record(z.string(), z.any())
        .optional()
        .describe('The collection object (for create/update)'),
      deleted: z.boolean().optional().describe('Whether the collection was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.title) {
        throw new Error('Title is required when creating a collection');
      }
      let collection = await client.createCollection({
        title: ctx.input.title,
        description: ctx.input.description,
        iconUrl: ctx.input.iconUrl,
        parent: ctx.input.parentId,
        targetAudience: ctx.input.targetAudience
      });
      return {
        output: { collection },
        message: `Created collection **${ctx.input.title}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.collectionId) {
        throw new Error('collectionId is required when updating a collection');
      }
      let collection = await client.updateCollection(ctx.input.collectionId, {
        title: ctx.input.title,
        description: ctx.input.description,
        iconUrl: ctx.input.iconUrl,
        targetAudience: ctx.input.targetAudience
      });
      return {
        output: { collection },
        message: `Updated collection **${ctx.input.collectionId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.collectionId) {
        throw new Error('collectionId is required when deleting a collection');
      }
      await client.deleteCollection(ctx.input.collectionId);
      return {
        output: { deleted: true },
        message: `Deleted collection **${ctx.input.collectionId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
