import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, update, retrieve, list, or archive collections in Metabase.
Collections organize questions, dashboards, and other content. Use "root" for top-level content and "trash" for archived content.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'list', 'list_items', 'tree'])
        .describe('The action to perform'),
      collectionId: z
        .union([z.number().int().positive(), z.string().min(1)])
        .optional()
        .describe(
          'Numeric ID, entity ID, "root", or "trash"; required for get, update, and list_items'
        ),
      filter: z
        .enum(['all', 'archived', 'personal'])
        .optional()
        .describe('Collection filter for list'),
      name: z.string().optional().describe('Collection name; required for create'),
      description: z.string().optional().describe('Collection description'),
      parentId: z
        .number()
        .int()
        .positive()
        .nullable()
        .optional()
        .describe('Parent collection ID, or null for the root'),
      color: z.string().optional().describe('Collection color, such as #509EE3'),
      archived: z.boolean().optional().describe('Archive state or archived-items filter'),
      itemModels: z
        .array(
          z.enum([
            'card',
            'dataset',
            'metric',
            'dashboard',
            'snippet',
            'collection',
            'document',
            'pulse'
          ])
        )
        .optional()
        .describe('Content models to include for list_items'),
      sortColumn: z
        .enum(['name', 'last_edited_at', 'last_edited_by', 'model'])
        .optional()
        .describe('Sort column for list_items'),
      sortDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction for list_items'),
      limit: z
        .number()
        .int()
        .positive()
        .max(1000)
        .optional()
        .describe('Maximum items to return'),
      offset: z.number().int().min(0).optional().describe('Number of items to skip')
    })
  )
  .output(
    z.object({
      collectionId: z.union([z.number(), z.string()]).optional().describe('Collection ID'),
      name: z.string().optional().describe('Collection name'),
      description: z.string().nullable().optional().describe('Collection description'),
      archived: z.boolean().optional().describe('Whether the collection is archived'),
      parentId: z.number().nullable().optional().describe('Parent collection ID'),
      collections: z
        .array(
          z.object({
            collectionId: z.union([z.number(), z.string()]),
            name: z.string(),
            archived: z.boolean().optional(),
            parentId: z.number().nullable().optional()
          })
        )
        .optional()
        .describe('Collections returned by list'),
      items: z
        .array(
          z.object({
            itemId: z.number(),
            name: z.string(),
            model: z.string(),
            description: z.string().nullable()
          })
        )
        .optional()
        .describe('Content returned by list_items'),
      tree: z.array(z.any()).optional().describe('Nested collection hierarchy'),
      total: z.number().optional().describe('Total matching items when reported by Metabase'),
      hasMore: z.boolean().optional().describe('Whether more items are available'),
      nextOffset: z.number().optional().describe('Offset for the next page')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create' && !ctx.input.name?.trim()) {
      throw createApiServiceError('Creating a collection requires name.', {
        reason: 'metabase_collection_name_missing'
      });
    }
    if (
      ['get', 'update', 'list_items'].includes(ctx.input.action) &&
      ctx.input.collectionId === undefined
    ) {
      throw createApiServiceError(`${ctx.input.action} requires collectionId.`, {
        reason: 'metabase_collection_id_missing'
      });
    }
    if (ctx.input.action === 'update' && typeof ctx.input.collectionId !== 'number') {
      throw createApiServiceError('Updating a collection requires its numeric collectionId.', {
        reason: 'metabase_collection_numeric_id_required'
      });
    }

    let client = new MetabaseClient(ctx.auth);

    if (ctx.input.action === 'tree') {
      let tree = await client.getCollectionTree();
      return {
        output: { tree },
        message: `Retrieved **${Array.isArray(tree) ? tree.length : 0}** top-level collection(s)`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listCollections({ filter: ctx.input.filter });
      let collections = (Array.isArray(result) ? result : []).map((collection: any) => ({
        collectionId: collection.id,
        name: collection.name,
        archived: collection.archived,
        parentId: collection.parent_id ?? null
      }));
      return {
        output: { collections },
        message: `Found **${collections.length}** collection(s)`
      };
    }

    if (ctx.input.action === 'list_items') {
      let result = await client.getCollectionItems(ctx.input.collectionId!, {
        models: ctx.input.itemModels,
        archived: ctx.input.archived,
        sortColumn: ctx.input.sortColumn,
        sortDirection: ctx.input.sortDirection,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      let data = result.data ?? result;
      let items = (Array.isArray(data) ? data : []).map((item: any) => ({
        itemId: item.id,
        name: item.name,
        model: item.model,
        description: item.description ?? null
      }));
      let total = typeof result.total === 'number' ? result.total : undefined;
      let offset = ctx.input.offset ?? 0;
      let hasMore = total === undefined ? undefined : offset + items.length < total;
      return {
        output: {
          collectionId: ctx.input.collectionId,
          items,
          total,
          hasMore,
          nextOffset: hasMore ? offset + items.length : undefined
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
