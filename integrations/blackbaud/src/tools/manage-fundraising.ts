import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// ── Campaigns ──

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List fundraising campaigns. Campaigns represent overall fundraising efforts or initiatives such as operating expenses, new buildings, and endowments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeInactive: z.boolean().optional().describe('Include inactive campaigns.'),
      dateAdded: z
        .string()
        .optional()
        .describe('Filter campaigns created on or after this date (ISO 8601).'),
      lastModified: z
        .string()
        .optional()
        .describe('Filter campaigns modified on or after this date (ISO 8601).'),
      limit: z
        .number()
        .optional()
        .describe('Number of records to return (default 500, max 5000).'),
      offset: z.number().optional().describe('Number of records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of campaigns.'),
      campaigns: z.array(z.any()).describe('Array of campaign records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.listCampaigns({
      includeInactive: ctx.input.includeInactive,
      dateAdded: ctx.input.dateAdded,
      lastModified: ctx.input.lastModified,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let campaigns = result?.value || [];
    let count = result?.count || 0;

    return {
      output: { count, campaigns },
      message: `Retrieved **${campaigns.length}** of ${count} campaign(s).`
    };
  })
  .build();

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve a fundraising campaign by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('System record ID of the campaign.')
    })
  )
  .output(
    z.object({
      campaign: z.any().describe('The campaign record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let campaign = await client.getCampaign(ctx.input.campaignId);

    return {
      output: { campaign },
      message: `Retrieved campaign **${campaign?.description || ctx.input.campaignId}**.`
    };
  })
  .build();

// ── Funds ──

export let listFunds = SlateTool.create(spec, {
  name: 'List Funds',
  key: 'list_funds',
  description: `List fundraising funds. Funds represent a constituent's intent for how you should use or earmark a gift, such as toward a specific cause or financial purpose.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeInactive: z.boolean().optional().describe('Include inactive funds.'),
      dateAdded: z
        .string()
        .optional()
        .describe('Filter funds created on or after this date (ISO 8601).'),
      lastModified: z
        .string()
        .optional()
        .describe('Filter funds modified on or after this date (ISO 8601).'),
      limit: z
        .number()
        .optional()
        .describe('Number of records to return (default 500, max 5000).'),
      offset: z.number().optional().describe('Number of records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of funds.'),
      funds: z.array(z.any()).describe('Array of fund records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.listFunds({
      includeInactive: ctx.input.includeInactive,
      dateAdded: ctx.input.dateAdded,
      lastModified: ctx.input.lastModified,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let funds = result?.value || [];
    let count = result?.count || 0;

    return {
      output: { count, funds },
      message: `Retrieved **${funds.length}** of ${count} fund(s).`
    };
  })
  .build();

export let getFund = SlateTool.create(spec, {
  name: 'Get Fund',
  key: 'get_fund',
  description: `Retrieve a fundraising fund by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fundId: z.string().describe('System record ID of the fund.')
    })
  )
  .output(
    z.object({
      fund: z.any().describe('The fund record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let fund = await client.getFund(ctx.input.fundId);

    return {
      output: { fund },
      message: `Retrieved fund **${fund?.description || ctx.input.fundId}**.`
    };
  })
  .build();

// ── Appeals ──

export let listAppeals = SlateTool.create(spec, {
  name: 'List Appeals',
  key: 'list_appeals',
  description: `List fundraising appeals. Appeals are solicitations used to bring in gifts, such as direct mailings, phonathons, auctions, or gala events.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeInactive: z.boolean().optional().describe('Include inactive appeals.'),
      dateAdded: z
        .string()
        .optional()
        .describe('Filter appeals created on or after this date (ISO 8601).'),
      lastModified: z
        .string()
        .optional()
        .describe('Filter appeals modified on or after this date (ISO 8601).'),
      limit: z
        .number()
        .optional()
        .describe('Number of records to return (default 500, max 5000).'),
      offset: z.number().optional().describe('Number of records to skip for pagination.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of appeals.'),
      appeals: z.array(z.any()).describe('Array of appeal records.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let result = await client.listAppeals({
      includeInactive: ctx.input.includeInactive,
      dateAdded: ctx.input.dateAdded,
      lastModified: ctx.input.lastModified,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let appeals = result?.value || [];
    let count = result?.count || 0;

    return {
      output: { count, appeals },
      message: `Retrieved **${appeals.length}** of ${count} appeal(s).`
    };
  })
  .build();

export let getAppeal = SlateTool.create(spec, {
  name: 'Get Appeal',
  key: 'get_appeal',
  description: `Retrieve a fundraising appeal by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appealId: z.string().describe('System record ID of the appeal.')
    })
  )
  .output(
    z.object({
      appeal: z.any().describe('The appeal record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let appeal = await client.getAppeal(ctx.input.appealId);

    return {
      output: { appeal },
      message: `Retrieved appeal **${appeal?.description || ctx.input.appealId}**.`
    };
  })
  .build();
