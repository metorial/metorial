import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLinkSharesTool = SlateTool.create(spec, {
  name: 'Get Link Shares',
  key: 'get_link_shares',
  description: `Read network-wide URL share counts through the retained legacy REST contract. The current Buffer API has no documented equivalent; legacy route availability is unverified.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to check sharing statistics for')
    })
  )
  .output(
    z.object({
      url: z.string().describe('The URL that was checked'),
      shares: z.number().describe('Number of times the URL has been shared via Buffer')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.getLinkShares(ctx.input.url);

    return {
      output: {
        url: ctx.input.url,
        shares: result.shares
      },
      message: `The URL has been shared **${result.shares}** time(s) via Buffer.`
    };
  })
  .build();
