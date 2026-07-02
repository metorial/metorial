import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, update, or delete a collection. Collections are the top-level organizational structure in Outline that group related documents together.
Use this to set up collection names, descriptions, colors, icons, and default access permissions.`,
  instructions: [
    'When creating a collection, the permission field controls default access: "read", "read_write", or null (no default access).'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID (required for update and delete)'),
      name: z.string().optional().describe('Name of the collection (required for create)'),
      description: z.string().optional().describe('Description of the collection'),
      color: z.string().optional().describe('Hex color code for the collection'),
      icon: z.string().optional().describe('Icon identifier for the collection'),
      permission: z
        .enum(['read', 'read_write'])
        .optional()
        .describe('Default permission level for all workspace members')
    })
  )
  .output(
    z.object({
      collectionId: z.string(),
      name: z.string().optional(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name) throw new Error('Name is required when creating a collection');
        let collection = await client.createCollection({
          name: ctx.input.name,
          description: ctx.input.description,
          color: ctx.input.color,
          icon: ctx.input.icon,
          permission: ctx.input.permission
        });
        return {
          output: {
            collectionId: collection.id,
            name: collection.name,
            action,
            success: true
          },
          message: `Created collection **"${collection.name}"**.`
        };
      }
      case 'update': {
        if (!ctx.input.collectionId) throw new Error('collectionId is required when updating');
        let collection = await client.updateCollection({
          id: ctx.input.collectionId,
          name: ctx.input.name,
          description: ctx.input.description,
          color: ctx.input.color,
          icon: ctx.input.icon,
          permission: ctx.input.permission
        });
        return {
          output: {
            collectionId: collection.id,
            name: collection.name,
            action,
            success: true
          },
          message: `Updated collection **"${collection.name}"**.`
        };
      }
      case 'delete': {
        if (!ctx.input.collectionId) throw new Error('collectionId is required when deleting');
        await client.deleteCollection(ctx.input.collectionId);
        return {
          output: { collectionId: ctx.input.collectionId, action, success: true },
          message: `Deleted collection.`
        };
      }
    }
  })
  .build();
