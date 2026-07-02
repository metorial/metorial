import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamClient } from '../lib/client';
import { spec } from '../spec';

let collectionSchema = z
  .object({
    collectionId: z.string().describe('Unique ID of the collection'),
    videoLibraryId: z.number().optional().describe('Parent video library ID'),
    name: z.string().optional().describe('Collection name'),
    videoCount: z.number().optional().describe('Number of videos in the collection'),
    totalSize: z.number().optional().describe('Total size in bytes'),
    previewVideoIds: z.string().optional().describe('Preview video IDs')
  })
  .passthrough();

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, list, retrieve, update, or delete video collections within a Bunny Stream library. Collections organize videos into groups for easier management and playback.`,
  constraints: ['Requires the Stream Library API Key to be configured.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      libraryId: z.number().describe('Video library ID'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID. Required for get, update, and delete.'),
      name: z.string().optional().describe('Collection name (create/update)'),
      search: z.string().optional().describe('Search term (list action)'),
      page: z.number().optional().describe('Page number (list action)'),
      itemsPerPage: z.number().optional().describe('Items per page (list action)'),
      orderBy: z.string().optional().describe('Order by field (list action)')
    })
  )
  .output(
    z.object({
      collection: collectionSchema.optional().describe('Collection details'),
      collections: z.array(collectionSchema).optional().describe('List of collections'),
      totalItems: z.number().optional().describe('Total number of collections'),
      currentPage: z.number().optional().describe('Current page number'),
      deleted: z.boolean().optional().describe('Whether the collection was deleted')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.streamToken) {
      throw new Error(
        'Stream Library API Key is required for collection operations. Please configure it in the authentication settings.'
      );
    }

    let client = new StreamClient({ streamToken: ctx.auth.streamToken });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listCollections(ctx.input.libraryId, {
          page: ctx.input.page,
          itemsPerPage: ctx.input.itemsPerPage,
          search: ctx.input.search,
          orderBy: ctx.input.orderBy
        });
        return {
          output: {
            collections: result.items || [],
            totalItems: result.totalItems,
            currentPage: result.currentPage
          },
          message: `Found **${result.totalItems}** collections in library ${ctx.input.libraryId}.`
        };
      }
      case 'get': {
        let collection = await client.getCollection(
          ctx.input.libraryId,
          ctx.input.collectionId!
        );
        return {
          output: { collection },
          message: `Retrieved collection **${collection.name}** (${collection.videoCount} videos).`
        };
      }
      case 'create': {
        let collection = await client.createCollection(ctx.input.libraryId, ctx.input.name!);
        return {
          output: { collection },
          message: `Created collection **${ctx.input.name}**.`
        };
      }
      case 'update': {
        let collection = await client.updateCollection(
          ctx.input.libraryId,
          ctx.input.collectionId!,
          ctx.input.name!
        );
        return {
          output: { collection },
          message: `Updated collection **${ctx.input.collectionId}**.`
        };
      }
      case 'delete': {
        await client.deleteCollection(ctx.input.libraryId, ctx.input.collectionId!);
        return {
          output: { deleted: true },
          message: `Deleted collection **${ctx.input.collectionId}**.`
        };
      }
    }
  })
  .build();
