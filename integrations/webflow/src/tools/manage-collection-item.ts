import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let manageCollectionItem = SlateTool.create(spec, {
  name: 'Manage Collection Item',
  key: 'manage_collection_item',
  description: `Create, update, or delete a CMS collection item. Provide field data as key-value pairs matching the collection's schema. Use the collection's field slugs as keys in fieldData.`,
  instructions: [
    'To **create** a new item, provide collectionId and fieldData (omit itemId).',
    'To **update** an existing item, provide collectionId, itemId, and fieldData with the fields to update.',
    'To **delete** an item, set action to "delete" and provide collectionId and itemId.',
    'Use the Get Collection tool first to discover the field slugs for the collection.'
  ]
})
  .input(
    z.object({
      collectionId: z.string().describe('Unique identifier of the CMS collection'),
      itemId: z
        .string()
        .optional()
        .describe('Item ID for updating or deleting an existing item'),
      action: z
        .enum(['create', 'update', 'delete'])
        .default('create')
        .describe('Action to perform'),
      fieldData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Key-value pairs of field slugs and their values'),
      isArchived: z.boolean().optional().describe('Whether the item should be archived'),
      isDraft: z.boolean().optional().describe('Whether the item should be a draft')
    })
  )
  .output(
    z.object({
      itemId: z.string().describe('Unique identifier of the collection item'),
      fieldData: z.record(z.string(), z.any()).optional().describe('Field data of the item'),
      isArchived: z.boolean().optional().describe('Whether the item is archived'),
      isDraft: z.boolean().optional().describe('Whether the item is a draft'),
      createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
      lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the item was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let { collectionId, itemId, action, fieldData, isArchived, isDraft } = ctx.input;

    if (action === 'delete') {
      if (!itemId) throw new Error('itemId is required for delete action');
      await client.deleteCollectionItem(collectionId, itemId);
      return {
        output: { itemId, deleted: true },
        message: `Deleted collection item **${itemId}** from collection **${collectionId}**.`
      };
    }

    if (action === 'update') {
      if (!itemId) throw new Error('itemId is required for update action');
      let item = await client.updateCollectionItem(collectionId, itemId, {
        fieldData,
        isArchived,
        isDraft
      });
      return {
        output: {
          itemId: item.id ?? itemId,
          fieldData: item.fieldData,
          isArchived: item.isArchived,
          isDraft: item.isDraft,
          createdOn: item.createdOn,
          lastUpdated: item.lastUpdated
        },
        message: `Updated collection item **${item.id ?? itemId}**.`
      };
    }

    // create
    if (!fieldData || Object.keys(fieldData).length === 0) {
      throw new Error('fieldData is required when creating a collection item');
    }
    let item = await client.createCollectionItem(collectionId, {
      fieldData,
      isArchived,
      isDraft
    });

    return {
      output: {
        itemId: item.id,
        fieldData: item.fieldData,
        isArchived: item.isArchived,
        isDraft: item.isDraft,
        createdOn: item.createdOn,
        lastUpdated: item.lastUpdated
      },
      message: `Created collection item **${item.id}** in collection **${collectionId}**.`
    };
  })
  .build();
