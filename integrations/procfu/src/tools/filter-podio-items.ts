import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let filterPodioItems = SlateTool.create(spec, {
  name: 'Filter Podio Items',
  key: 'filter_podio_items',
  description: `Filter items in a Podio app using the Podio filter API format. Supports complex filter criteria with field IDs and filter values.
This is more powerful than search for building precise queries with multiple conditions. Follows the [Podio filter API](https://developers.podio.com/doc/items/filter-items-4496747) specification.`,
  instructions: [
    'The filter must follow Podio API filter syntax, e.g. {"filters":{"field_id":[value]},"sort_by":"created_on","sort_desc":true,"limit":50}'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      appId: z.string().describe('The Podio App ID to filter items from'),
      filter: z
        .record(z.string(), z.any())
        .describe(
          'Filter criteria in Podio API format with filters, sort_by, sort_desc, limit, offset'
        )
    })
  )
  .output(
    z.object({
      items: z.any().describe('The filtered items result from the Podio API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let filterStr = JSON.stringify(ctx.input.filter);
    let result = await client.filterItems(ctx.input.appId, filterStr);

    return {
      output: { items: result },
      message: `Filtered items from app **${ctx.input.appId}**.`
    };
  })
  .build();
