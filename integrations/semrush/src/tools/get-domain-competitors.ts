import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushAnalyticsClient } from '../lib/client';
import { transformResults } from '../lib/csv-parser';
import { spec } from '../spec';

export let getDomainCompetitors = SlateTool.create(spec, {
  name: 'Get Domain Competitors',
  key: 'get_domain_competitors',
  description: `Find and analyze a domain's organic and/or paid search competitors.
Competitors are identified by shared keyword overlap. Returns competition levels, shared keyword counts, and traffic estimates for each competitor.`,
  instructions: [
    'Set competitorType to target organic SEO competitors, paid advertising competitors, or both.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to find competitors for (e.g., "example.com")'),
      competitorType: z
        .enum(['organic', 'paid', 'both'])
        .default('organic')
        .describe('Type of competitors to find'),
      database: z.string().optional().describe('Regional database code (e.g., us, uk, de)'),
      limit: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of competitors to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      organicCompetitors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Organic search competitors'),
      paidCompetitors: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Paid search competitors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushAnalyticsClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      database: ctx.config.database
    });

    let db = ctx.input.database || ctx.config.database;
    let organicCompetitors: Record<string, unknown>[] | undefined;
    let paidCompetitors: Record<string, unknown>[] | undefined;

    if (ctx.input.competitorType === 'organic' || ctx.input.competitorType === 'both') {
      let results = await client.getOrganicCompetitors({
        domain: ctx.input.domain,
        database: db,
        displayLimit: ctx.input.limit,
        displayOffset: ctx.input.offset
      });
      organicCompetitors = transformResults(results);
    }

    if (ctx.input.competitorType === 'paid' || ctx.input.competitorType === 'both') {
      let results = await client.getAdwordsCompetitors({
        domain: ctx.input.domain,
        database: db,
        displayLimit: ctx.input.limit,
        displayOffset: ctx.input.offset
      });
      paidCompetitors = transformResults(results);
    }

    let parts: string[] = [];
    if (organicCompetitors) parts.push(`${organicCompetitors.length} organic competitors`);
    if (paidCompetitors) parts.push(`${paidCompetitors.length} paid competitors`);

    return {
      output: {
        organicCompetitors,
        paidCompetitors
      },
      message: `Found ${parts.join(' and ')} for **${ctx.input.domain}** (database: ${db}).`
    };
  })
  .build();
