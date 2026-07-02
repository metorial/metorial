import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from '../lib/client';
import { spec } from '../spec';

export let getCustomFeeds = SlateTool.create(spec, {
  name: 'Get Custom Feeds',
  key: 'get_custom_feeds',
  description: `Retrieve all custom feeds (filtered views of leads) for an account. Includes built-in feeds like "All leads", "New leads", "Top leads", and "Followed companies", as well as user-defined feeds with their filter criteria.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('Leadfeeder account ID. Falls back to config or first available account.')
    })
  )
  .output(
    z.object({
      feeds: z.array(
        z.object({
          feedId: z.string().describe('Unique feed identifier, can be used to filter leads'),
          name: z.string().describe('Feed name'),
          criteria: z.array(z.any()).describe('Filter criteria for the feed')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadfeederClient(ctx.auth.token);

    let accountId = ctx.input.accountId ?? ctx.config.accountId;
    if (!accountId) {
      let accounts = await client.getAccounts();
      if (accounts.length === 0) throw new Error('No Leadfeeder accounts found');
      accountId = accounts[0]!.accountId;
    }

    let feeds = await client.getCustomFeeds(accountId);

    return {
      output: { feeds },
      message: `Found **${feeds.length}** custom feed(s): ${feeds.map(f => `"${f.name}"`).join(', ')}.`
    };
  })
  .build();
