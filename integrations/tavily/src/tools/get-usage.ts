import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsage = SlateTool.create(spec, {
  name: 'Get Usage',
  key: 'get_usage',
  description: `Retrieve API credit usage information for your Tavily account. Returns a breakdown of credits consumed by each endpoint (search, extract, crawl, map, research) along with plan limits and pay-as-you-go usage.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      totalCreditsUsed: z.number().describe('Total credits used this billing cycle'),
      creditsLimit: z.number().nullable().describe('Usage cap (null if unlimited)'),
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
      message: `**${usage.currentPlan}** plan: **${usage.usage}** credits used${usage.limit !== null ? ` of ${usage.limit}` : ''}. Search: ${usage.searchUsage}, Extract: ${usage.extractUsage}, Crawl: ${usage.crawlUsage}, Map: ${usage.mapUsage}, Research: ${usage.researchUsage}.`
    };
  })
  .build();
