import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `Retrieve all CRM collections in the workspace. Collections are data containers like People, Companies, Deals, or custom types. Returns each collection's ID, name, slug, and type. Use this to discover collection IDs needed for record operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      collectionId: z
        .string()
        .optional()
        .describe(
          'Specific collection ID to retrieve details for. If omitted, returns all collections.'
        )
    })
  )
  .output(
    z.object({
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('Collection ID'),
            name: z.string().describe('Collection name'),
            slug: z.string().describe('Collection slug'),
            collectionType: z
              .string()
              .describe('Collection type (people, company, deals, custom)')
          })
        )
        .describe('List of collections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });

    if (ctx.input.collectionId) {
      let result = await client.getCollection(ctx.input.collectionId);
      let col = result.data;
      return {
        output: {
          collections: col
            ? [
                {
                  collectionId: col._id,
                  name: col.name,
                  slug: col.slug,
                  collectionType: col.collectionType
                }
              ]
            : []
        },
        message: col
          ? `Retrieved collection: **${col.name}** (${col.collectionType}).`
          : 'Collection not found.'
      };
    }

    let result = await client.getCollections();
    let collections = (Array.isArray(result.data) ? result.data : []).map((col: any) => ({
      collectionId: col._id,
      name: col.name,
      slug: col.slug,
      collectionType: col.collectionType
    }));

    return {
      output: { collections },
      message: `Found ${collections.length} collection(s): ${collections.map((c: any) => c.name).join(', ')}.`
    };
  })
  .build();
