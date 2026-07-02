import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let getPodioItem = SlateTool.create(spec, {
  name: 'Get Podio Item',
  key: 'get_podio_item',
  description: `Retrieve a Podio item by its ID. Returns simplified field values by default, or the full raw Podio payload if requested.
Use this to fetch item data for processing, display, or further automation.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      podioItemId: z.string().describe('The Podio item ID to retrieve'),
      raw: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, returns the full raw Podio payload instead of simplified field values'
        )
    })
  )
  .output(
    z.object({
      item: z.any().describe('The Podio item data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let item = ctx.input.raw
      ? await client.getItemRaw(ctx.input.podioItemId)
      : await client.getItem(ctx.input.podioItemId);

    return {
      output: { item },
      message: `Retrieved Podio item **${ctx.input.podioItemId}**${ctx.input.raw ? ' (raw payload)' : ''}.`
    };
  })
  .build();
