import { SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

export let listDataCollections = SlateTool.create(spec, {
  name: 'List CMS Collections',
  key: 'list_data_collections',
  description: `List the Wix CMS data collections on the site, including each collection's ID, display name, type, and field structure.
Use this to discover the collectionId and field keys needed by Manage CMS Data.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max collections to return'),
      offset: z.number().optional().describe('Number of collections to skip')
    })
  )
  .output(
    z.object({
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID to use as collectionId'),
            displayName: z.string().optional().describe('Collection name shown in the CMS'),
            collectionType: z
              .string()
              .optional()
              .describe('NATIVE, WIX_APP, BLOCKS_APP, or EXTERNAL'),
            displayNamespace: z
              .string()
              .optional()
              .describe('Wix app that owns the collection, such as Stores'),
            fields: z
              .array(
                z.object({
                  key: z.string().describe('Field key used in item data'),
                  displayName: z.string().optional().describe('Field name shown in the CMS'),
                  type: z.string().optional().describe('Field data type')
                })
              )
              .describe('Collection fields')
          })
        )
        .describe('CMS data collections'),
      totalResults: z.number().optional().describe('Total number of collections')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);
    let result = await client.listDataCollections({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let collections = (result.collections || []).map((collection: Record<string, any>) => ({
      collectionId: collection.id,
      displayName: collection.displayName,
      collectionType: collection.collectionType,
      displayNamespace: collection.displayNamespace || undefined,
      fields: (collection.fields || []).map((field: Record<string, any>) => ({
        key: field.key,
        displayName: field.displayName,
        type: field.type
      }))
    }));

    return {
      output: { collections, totalResults: result.pagingMetadata?.total },
      message: `Found **${collections.length}** CMS collections`
    };
  })
  .build();
