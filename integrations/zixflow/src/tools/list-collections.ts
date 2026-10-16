import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { providerRecords, providerString } from '../lib/response';
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
      raw: z.unknown().optional().describe('Complete response returned by Zixflow'),
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

    let result = ctx.input.collectionId
      ? await client.getCollection(ctx.input.collectionId)
      : await client.getCollections();
    let data = ctx.input.collectionId
      ? result.data === null
        ? []
        : providerRecords([result.data])
      : providerRecords(result.data);
    let collections = data.map(col => ({
      collectionId: providerString(col._id, 'collection ID'),
      name: providerString(col.name, 'collection name'),
      slug: providerString(col.slug, 'collection slug'),
      collectionType: providerString(col.collectionType, 'collection type')
    }));
    return {
      output: { collections, raw: result },
      message: `Retrieved ${collections.length} collection(s).`
    };
  })
  .build();
