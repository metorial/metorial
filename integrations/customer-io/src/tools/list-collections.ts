import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let listCollections = SlateTool.create(spec, {
  name: 'List Collections',
  key: 'list_collections',
  description: `Retrieve all collections in your Customer.io workspace. Collections are sets of reusable data (promotions, events, courses, etc.) that you reference in campaigns with Liquid templates.`,
  constraints: ['Available on Premium and Enterprise plans only.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      collections: z
        .array(
          z.object({
            collectionId: z.string().describe('The collection ID'),
            name: z.string().describe('The collection name'),
            dataType: z.string().optional().describe('The data source type (json, csv, url)'),
            url: z.string().optional().describe('The source URL if applicable')
          })
        )
        .describe('Array of collections')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.listCollections();
    let collections = (result?.collections ?? []).map((c: any) => ({
      collectionId: String(c.id),
      name: c.name,
      dataType: c.data_type ?? c.type,
      url: c.url
    }));

    return {
      output: { collections },
      message: `Found **${collections.length}** collections.`
    };
  })
  .build();
