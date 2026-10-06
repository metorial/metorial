import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve native API-key usage (optionally project scoped) and separate account plan usage. Returns a breakdown of credits consumed by each endpoint (search, extract, crawl, map, research) along with plan limits and pay-as-you-go usage.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      totalCreditsUsed: z
        .number()
        .describe('Native API-key credits used; optionally scoped by configured project'),
      creditsLimit: z
        .number()
        .nullable()
        .describe('Native API-key usage cap (null if unlimited)'),
      searchCreditsUsed: z.number().describe('Credits consumed by search requests'),
      extractCreditsUsed: z.number().describe('Credits consumed by extract requests'),
      crawlCreditsUsed: z.number().describe('Credits consumed by crawl requests'),
      mapCreditsUsed: z.number().describe('Credits consumed by map requests'),
      researchCreditsUsed: z.number().describe('Credits consumed by research requests'),
      currentPlan: z.string().describe('Active subscription plan name'),
      planCreditsUsed: z.number().describe('Plan credits consumed this cycle'),
      planCreditsLimit: z.number().describe('Plan credit ceiling'),
      paygoCreditsUsed: z.number().describe('Pay-as-you-go credits used'),
      paygoCreditsLimit: z.number().describe('Pay-as-you-go credit ceiling')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let usage = await client.getUsage();

    return {
      output: {
        totalCreditsUsed: usage.usage,
        creditsLimit: usage.limit,
        searchCreditsUsed: usage.searchUsage,
        extractCreditsUsed: usage.extractUsage,
        crawlCreditsUsed: usage.crawlUsage,
        mapCreditsUsed: usage.mapUsage,
        researchCreditsUsed: usage.researchUsage,
        currentPlan: usage.currentPlan,
        planCreditsUsed: usage.planUsage,
        planCreditsLimit: usage.planLimit,
        paygoCreditsUsed: usage.paygoUsage,
        paygoCreditsLimit: usage.paygoLimit
      },
      message: `${ctx.config.projectId ? 'Project-scoped API-key' : 'API-key'} usage: **${usage.usage}** credits${usage.limit !== null ? ` of ${usage.limit}` : ' (no key cap reported)'}. Account **${usage.currentPlan}** plan: **${usage.planUsage} of ${usage.planLimit}** credits. Pay-as-you-go: **${usage.paygoUsage} of ${usage.paygoLimit}** credits. Key endpoint totals — Search: ${usage.searchUsage}, Extract: ${usage.extractUsage}, Crawl: ${usage.crawlUsage}, Map: ${usage.mapUsage}, Research: ${usage.researchUsage}.`
    };
  })
  .build();
