import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageSchema, storefrontSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listStorefronts = SlateTool.create(spec, {
  name: 'List Storefronts',
  key: 'list_storefronts',
  description: `Retrieve one page of storefronts (stores/websites) associated with your DPD account. Returns a summary of each returned storefront including name, URL, currency, and type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('1-based page; omitted means page 1. Continue until endOfResults is true.')
    })
  )
  .output(z.object({ storefronts: z.array(storefrontSchema), ...pageSchema }))
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listStorefronts(ctx.input.page);

    return {
      output: {
        storefronts: result.items,
        page: result.page,
        nextPage: result.nextPage,
        endOfResults: result.endOfResults
      },
      message: `Retrieved ${result.items.length} storefronts on page ${result.page}${result.endOfResults ? '; end of results confirmed' : ''}.`
    };
  })
  .build();
