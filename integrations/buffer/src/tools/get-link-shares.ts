import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLinkSharesTool = SlateTool.create(spec, {
  name: 'Get Link Shares',
  key: 'get_link_shares',
  description: `Get the number of times a URL has been shared using Buffer. Useful for gauging the popularity of a link across the Buffer network.`,
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
    let client = new Client({ token: ctx.auth.token });
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
