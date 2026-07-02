import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGivingSummary = SlateTool.create(spec, {
  name: 'Get Giving Summary',
  key: 'get_giving_summary',
  description: `Retrieve giving summary for a constituent, including lifetime giving totals, first gift, latest gift, and greatest gift. Provides a comprehensive view of a constituent's giving history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      constituentId: z.string().describe('System record ID of the constituent.')
    })
  )
  .output(
    z.object({
      lifetimeGiving: z
        .any()
        .optional()
        .describe(
          'Lifetime giving summary including total giving, pledge balance, consecutive years, etc.'
        ),
      firstGift: z.any().optional().describe('First gift summary.'),
      latestGift: z.any().optional().describe('Latest gift summary.'),
      greatestGift: z.any().optional().describe('Greatest gift summary.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subscriptionKey: ctx.auth.subscriptionKey
    });

    let [lifetimeGiving, firstGift, latestGift, greatestGift] = await Promise.all([
      client.getConstituentLifetimeGiving(ctx.input.constituentId).catch(() => null),
      client.getConstituentFirstGift(ctx.input.constituentId).catch(() => null),
      client.getConstituentLatestGift(ctx.input.constituentId).catch(() => null),
      client.getConstituentGreatestGift(ctx.input.constituentId).catch(() => null)
    ]);

    let totalGiving = lifetimeGiving?.total_giving?.value;
    let summary =
      totalGiving !== undefined
        ? `Lifetime giving: **$${totalGiving}**`
        : 'No giving data available';

    return {
      output: { lifetimeGiving, firstGift, latestGift, greatestGift },
      message: `Giving summary for constituent **${ctx.input.constituentId}**. ${summary}.`
    };
  })
  .build();
