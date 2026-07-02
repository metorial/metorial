import { SlateTool } from 'slates';
import { z } from 'zod';
import { tableauServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let collectionSchema = z.object({
  collectionId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  ownerName: z.string().optional(),
  ownerId: z.string().optional(),
  visibility: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  totalItemCount: z.number().optional(),
  permissionedItemCount: z.number().optional()
});

let collectionItemSchema = z.object({
  contentLuid: z.string().optional(),
  contentType: z.string().optional(),
  contentName: z.string().optional(),
  collectionLuid: z.string().optional(),
  addedAt: z.string().optional()
});

let optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
let optionalIdString = (value: unknown) =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;

let collectionItems = (result: any) => {
  if (Array.isArray(result.items)) return result.items;
  if (Array.isArray(result.collections)) return result.collections;
  if (Array.isArray(result.collections?.collection)) return result.collections.collection;
  return [];
};

let normalizeCollection = (collection: any) => ({
  collectionId:
    optionalString(collection.luid) ||
    optionalString(collection.collectionLuid) ||
    optionalIdString(collection.id) ||
    '',
  name: optionalString(collection.name),
  description: optionalString(collection.description),
  ownerName: optionalString(collection.ownerName),
  ownerId: optionalString(collection.userId) || optionalString(collection.ownerLuid),
  visibility: optionalString(collection.visibility),
  createdAt: optionalString(collection.createdTime) || optionalString(collection.createdAt),
  updatedAt: optionalString(collection.updatedTime) || optionalString(collection.updatedAt),
  totalItemCount:
    collection.totalItemCount != null ? Number(collection.totalItemCount) : undefined,
  permissionedItemCount:
    collection.permissionedItemCount != null
      ? Number(collection.permissionedItemCount)
      : undefined
});

let normalizeCollectionItem = (item: any) => ({
  contentLuid: optionalString(item.content?.luid) || optionalString(item.contentLuid),
  contentType: optionalString(item.content?.contentType) || optionalString(item.contentType),
  contentName: optionalString(item.content?.name) || optionalString(item.contentName),
  collectionLuid: optionalString(item.collectionLuid),
  addedAt: optionalString(item.addedDate) || optionalString(item.addedAt)
});

export let manageCollections = SlateTool.create(spec, {
  name: 'Manage Collections',
  key: 'manage_collections',
  description: `List, get, create, update, or delete collections, and add, remove, or list collection items. Collections are curated groups of Tableau content.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'listItems',
          'addItems',
          'removeItems'
        ])
        .describe('Operation to perform'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection LUID (required except for list and create)'),
      name: z.string().optional().describe('Collection name (required for create)'),
      description: z.string().optional().describe('Collection description'),
      ownerId: z
        .string()
        .optional()
        .describe(
          'Owner user LUID for update actions. Defaults to the authenticated Tableau user.'
        ),
      items: z
        .array(
          z.object({
            contentLuid: z.string().describe('LUID of the content item'),
            contentType: z.string().describe('Tableau content type, such as workbook or view'),
            contentName: z.string().optional().describe('Display name of the content item')
          })
        )
        .optional()
        .describe('Items to add or remove from the collection'),
      pageSize: z.number().int().positive().optional().describe('Page size for list actions'),
      pageNumber: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Page number for list actions'),
      filter: z.string().optional().describe('Filter expression for list actions'),
      sort: z.string().optional().describe('Sort expression for list actions')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionSchema).optional(),
      collection: collectionSchema.optional(),
      items: z.array(collectionItemSchema).optional(),
      totalCount: z.number().optional(),
      deleted: z.boolean().optional(),
      updatedItems: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.queryCollections({
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
      let collections = collectionItems(result).map(normalizeCollection);
      let pagination = result.pagination || {};
      return {
        output: {
          collections,
          totalCount: Number(
            result.totalCount || pagination.totalAvailable || collections.length
          )
        },
        message: `Found **${collections.length}** collections.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw tableauServiceError('name is required for create action.');

      let collection = await client.createCollection(ctx.input.name, ctx.input.description);
      return {
        output: {
          collection: normalizeCollection(collection)
        },
        message: `Created collection **${collection.name}**.`
      };
    }

    if (!ctx.input.collectionId) {
      throw tableauServiceError(`collectionId is required for ${action} action.`);
    }

    if (action === 'get') {
      let collection = await client.getCollection(ctx.input.collectionId);
      return {
        output: {
          collection: normalizeCollection(collection)
        },
        message: `Retrieved collection **${collection.name}**.`
      };
    }

    if (action === 'update') {
      if (ctx.input.name === undefined && ctx.input.description === undefined) {
        throw tableauServiceError('Provide name or description to update a collection.');
      }

      let collection = await client.updateCollection(ctx.input.collectionId, {
        name: ctx.input.name,
        description: ctx.input.description,
        ownerId: ctx.input.ownerId
      });
      return {
        output: {
          collection: normalizeCollection(collection)
        },
        message: `Updated collection **${collection.name}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteCollection(ctx.input.collectionId);
      return {
        output: { deleted: true },
        message: `Deleted collection \`${ctx.input.collectionId}\`.`
      };
    }

    if (action === 'listItems') {
      let result = await client.listCollectionItems(ctx.input.collectionId, {
        pageSize: ctx.input.pageSize,
        pageNumber: ctx.input.pageNumber,
        filter: ctx.input.filter,
        sort: ctx.input.sort
      });
      let items = (result.items || []).map(normalizeCollectionItem);
      let pagination = result.pagination || {};
      return {
        output: {
          items,
          totalCount: Number(result.totalCount || pagination.totalAvailable || items.length)
        },
        message: `Found **${items.length}** collection items.`
      };
    }

    if (action === 'addItems') {
      if (!ctx.input.items?.length) {
        throw tableauServiceError('items is required for addItems action.');
      }

      let result = await client.addItemsToCollection(ctx.input.collectionId, ctx.input.items);
      return {
        output: { updatedItems: result },
        message: `Added **${ctx.input.items.length}** item(s) to collection \`${ctx.input.collectionId}\`.`
      };
    }

    if (action === 'removeItems') {
      if (!ctx.input.items?.length) {
        throw tableauServiceError('items is required for removeItems action.');
      }

      let result = await client.removeItemsFromCollection(
        ctx.input.collectionId,
        ctx.input.items
      );
      return {
        output: { updatedItems: result },
        message: `Removed **${ctx.input.items.length}** item(s) from collection \`${ctx.input.collectionId}\`.`
      };
    }

    throw tableauServiceError(`Unknown action: ${action}`);
  })
  .build();
