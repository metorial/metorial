import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let usageOutputSchema = z.object({
  usage: z.record(z.string(), z.any()).describe('Usage data returned by Firecrawl')
});

export let getCreditUsageTool = SlateTool.create(spec, {
  name: 'Get Credit Usage',
  key: 'get_credit_usage',
  description: `Get remaining Firecrawl credits for the authenticated team.`,
  instructions: ['Use this before higher-credit operations to inspect available credits.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(usageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCreditUsage();

    return {
      output: {
        usage: result
      },
      message: 'Retrieved Firecrawl credit usage.'
    };
  });

export let getHistoricalCreditUsageTool = SlateTool.create(spec, {
  name: 'Get Historical Credit Usage',
  key: 'get_historical_credit_usage',
  description: `Get historical Firecrawl credit usage for the authenticated team.`,
  instructions: ['Set byApiKey to true to group historical usage by API key when supported.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      byApiKey: z.boolean().optional().describe('Group usage by API key')
    })
  )
  .output(usageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getHistoricalCreditUsage(ctx.input.byApiKey);

    return {
      output: {
        usage: result
      },
      message: 'Retrieved Firecrawl historical credit usage.'
    };
  });

export let getTokenUsageTool = SlateTool.create(spec, {
  name: 'Get Token Usage',
  key: 'get_token_usage',
  description: `Get remaining Firecrawl extract tokens for the authenticated team.`,
  instructions: ['Use this before extraction jobs to inspect token availability.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(usageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTokenUsage();

    return {
      output: {
        usage: result
      },
      message: 'Retrieved Firecrawl token usage.'
    };
  });

export let getHistoricalTokenUsageTool = SlateTool.create(spec, {
  name: 'Get Historical Token Usage',
  key: 'get_historical_token_usage',
  description: `Get historical Firecrawl extract token usage for the authenticated team.`,
  instructions: ['Set byApiKey to true to group historical usage by API key when supported.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      byApiKey: z.boolean().optional().describe('Group usage by API key')
    })
  )
  .output(usageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getHistoricalTokenUsage(ctx.input.byApiKey);

    return {
      output: {
        usage: result
      },
      message: 'Retrieved Firecrawl historical token usage.'
    };
  });

export let getQueueStatusTool = SlateTool.create(spec, {
  name: 'Get Queue Status',
  key: 'get_queue_status',
  description: `Get Firecrawl scrape queue metrics for the authenticated team.`,
  instructions: ['Use this to inspect concurrency and queue pressure.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      queueStatus: z.record(z.string(), z.any()).describe('Queue status data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getQueueStatus();

    return {
      output: {
        queueStatus: result
      },
      message: 'Retrieved Firecrawl queue status.'
    };
  });

export let listActivityTool = SlateTool.create(spec, {
  name: 'List Activity',
  key: 'list_activity',
  description: `List recent Firecrawl API activity for the authenticated team.`,
  instructions: [
    'Use endpoint to filter by Firecrawl endpoint family and cursor for pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      endpoint: z.string().optional().describe('Endpoint filter, e.g. scrape or crawl'),
      limit: z.number().optional().describe('Number of activity records to return'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      activity: z.array(z.any()).optional().describe('Recent activity records'),
      nextCursor: z.string().optional().describe('Pagination cursor for the next page'),
      raw: z.record(z.string(), z.any()).describe('Raw Firecrawl activity response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listActivity({
      endpoint: ctx.input.endpoint,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let activity = result.data ?? result.activity;

    return {
      output: {
        activity: Array.isArray(activity) ? activity : undefined,
        nextCursor: result.nextCursor ?? result.cursor,
        raw: result
      },
      message: `Retrieved **${Array.isArray(activity) ? activity.length : 0}** Firecrawl activity record(s).`
    };
  });
