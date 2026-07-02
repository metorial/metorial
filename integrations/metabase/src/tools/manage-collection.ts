import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, update, retrieve, or archive a collection in Metabase.
Collections organize questions, dashboards, and other items (similar to folders).
Use "root" as the collectionId to access the root collection.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list_items', 'tree'])
        .describe('The action to perform'),
      collectionId: z
        .union([z.number(), z.literal('root')])
        .optional()
        .describe(
          'ID of the collection (required for get, update, list_items). Use "root" for root collection.'
        ),
      name: z.string().optional().describe('Name of the collection (required for create)'),
      description: z.string().optional().describe('Description of the collection'),
      parentId: z
        .number()
        .nullable()
        .optional()
        .describe('Parent collection ID (null for root level)'),
      color: z.string().optional().describe('Collection color (hex code like #509EE3)'),
      archived: z.boolean().optional().describe('Set to true to archive the collection'),
      itemModels: z
        .array(z.enum(['card', 'dashboard', 'collection', 'pulse']))
        .optional()
        .describe('Filter items by model type (for list_items action)'),
      sortColumn: z
        .enum(['name', 'last_edited_at', 'last_edited_by', 'model'])
        .optional()
        .describe('Sort column for items'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction for items')
    })
  )
  .output(
    z.object({
      collectionId: z
        .union([z.number(), z.string()])
        .optional()
        .describe('ID of the collection'),
      name: z.string().optional().describe('Name of the collection'),
      description: z.string().nullable().optional().describe('Description'),
      archived: z.boolean().optional().describe('Whether the collection is archived'),
      parentId: z.number().nullable().optional().describe('Parent collection ID'),
      items: z
        .array(
          z.object({
            itemId: z.number().describe('ID of the item'),
            name: z.string().describe('Name of the item'),
            model: z.string().describe('Type of item (card, dashboard, collection, etc.)'),
            description: z.string().nullable().describe('Description of the item')
          })
        )
        .optional()
        .describe('Items in the collection (for list_items and tree actions)'),
      tree: z.array(z.any()).optional().describe('Collection tree hierarchy (for tree action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.action === 'tree') {
      let tree = await client.getCollectionTree();
      return {
        output: {
          tree
        },
        message: `Retrieved collection tree with **${Array.isArray(tree) ? tree.length : 0}** top-level collection(s)`
      };
    }

    if (ctx.input.action === 'list_items') {
      let result = await client.getCollectionItems(ctx.input.collectionId!, {
        models: ctx.input.itemModels,
        sortColumn: ctx.input.sortColumn,
        sortDirection: ctx.input.sortDirection
      });

      let data = result.data || result;
      let items = (Array.isArray(data) ? data : []).map((item: any) => ({
        itemId: item.id,
        name: item.name,
        model: item.model,
        description: item.description ?? null
      }));

      return {
        output: {
          collectionId: ctx.input.collectionId,
          items
        },
        message: `Found **${items.length}** item(s) in collection ${ctx.input.collectionId}`
      };
    }

    if (ctx.input.action === 'create') {
      let collection = await client.createCollection({
        name: ctx.input.name!,
        description: ctx.input.description,
        parentId: ctx.input.parentId,
        color: ctx.input.color
      });

      return {
        output: {
          collectionId: collection.id,
          name: collection.name,
          description: collection.description ?? null,
          archived: collection.archived ?? false,
          parentId: collection.parent_id ?? null
        },
        message: `Created collection **${collection.name}** (ID: ${collection.id})`
      };
    }

    if (ctx.input.action === 'update') {
      let collection = await client.updateCollection(ctx.input.collectionId as number, {
        name: ctx.input.name,
        description: ctx.input.description,
        archived: ctx.input.archived,
        parentId: ctx.input.parentId,
        color: ctx.input.color
      });

      return {
        output: {
          collectionId: collection.id,
          name: collection.name,
          description: collection.description ?? null,
          archived: collection.archived ?? false,
          parentId: collection.parent_id ?? null
        },
        message: `Updated collection **${collection.name}** (ID: ${collection.id})`
      };
    }

    // get
    let collection = await client.getCollection(ctx.input.collectionId!);

    return {
      output: {
        collectionId: collection.id,
        name: collection.name,
        description: collection.description ?? null,
        archived: collection.archived ?? false,
        parentId: collection.parent_id ?? null
      },
      message: `Retrieved collection **${collection.name}** (ID: ${collection.id})`
    };
  })
  .build();
