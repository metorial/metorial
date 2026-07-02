import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

let collectionSchema = z.object({
  collectionId: z.string().describe('Unique identifier for the collection'),
  displayName: z.string().describe('Display name of the collection'),
  singularName: z.string().optional().describe('Singular name of the collection'),
  slug: z.string().optional().describe('URL slug of the collection'),
  createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
  lastUpdated: z.string().optional().describe('ISO 8601 last update timestamp')
});

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `List all CMS collections for a Webflow site. Collections define the schema/structure for CMS content. Each collection contains fields and items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('Unique identifier of the Webflow site')
    })
  )
  .output(
    z.object({
      collections: z.array(collectionSchema).describe('List of CMS collections')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);
    let data = await client.listCollections(ctx.input.siteId);
    let collections = (data.collections ?? []).map((c: any) => ({
      collectionId: c.id,
      displayName: c.displayName ?? '',
      singularName: c.singularName,
      slug: c.slug,
      createdOn: c.createdOn,
      lastUpdated: c.lastUpdated
    }));

    return {
      output: { collections },
      message: `Found **${collections.length}** collection(s).`
    };
  })
  .build();
