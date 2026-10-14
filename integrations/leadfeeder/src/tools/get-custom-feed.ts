import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCustomFeed = SlateTool.create(spec, {
  name: 'Get Custom Feed',
  key: 'get_custom_feed',
  description:
    'Inspect a custom lead feed and its filter criteria before retrieving or exporting its leads. Call get_accounts for account IDs and get_custom_feeds for feed IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      feedId: z.string().describe('Custom feed ID from get_custom_feeds.')
    })
  )
  .output(
    z.object({
      feedId: z.string(),
      name: z.string(),
      criteria: z
        .array(z.unknown())
        .describe('Provider-defined filter criteria for this feed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadfeederClient(ctx.auth.token);
    let accountId = await client.resolveAccountId(ctx.input.accountId ?? ctx.config.accountId);
    let feed = await client.getCustomFeed(accountId, ctx.input.feedId);
    return {
      output: feed,
      message: `Retrieved custom feed **${feed.name}**.`
    };
  })
  .build();
