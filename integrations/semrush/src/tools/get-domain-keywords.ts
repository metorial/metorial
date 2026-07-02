import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushAnalyticsClient } from '../lib/client';
import { transformResults } from '../lib/csv-parser';
import { spec } from '../spec';

export let getDomainKeywords = SlateTool.create(spec, {
  name: 'Get Domain Keywords',
  key: 'get_domain_keywords',
  description: `Retrieve organic and/or paid keywords that a domain ranks for in search results.
Returns keyword positions, search volumes, traffic estimates, CPC, and competition data.
Useful for understanding which keywords drive traffic to a domain and analyzing its search strategy.`,
  instructions: [
    'Set searchType to "organic" for SEO keywords, "paid" for PPC keywords, or "both" for a combined view.',
    'Use filters to narrow results (e.g., by position range, volume, or specific keyword patterns).',
    'Results are paginated - use limit and offset for large result sets.'
  ],
  constraints: ['Maximum 10,000 results per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to analyze (e.g., "example.com")'),
      searchType: z
        .enum(['organic', 'paid', 'both'])
        .default('organic')
        .describe('Type of keywords to retrieve'),
      database: z.string().optional().describe('Regional database code (e.g., us, uk, de)'),
      limit: z.number().optional().default(50).describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination'),
      sortBy: z
        .string()
        .optional()
        .describe(
          'Sort field and order (e.g., "tr_desc" for traffic descending, "po_asc" for position ascending)'
        ),
      filter: z
        .string()
        .optional()
        .describe('Filter expression (e.g., "+|Po|Lt|11" for position < 11)')
    })
  )
  .output(
    z.object({
      organicKeywords: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Organic keyword rankings'),
      paidKeywords: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Paid keyword data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushAnalyticsClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      database: ctx.config.database
    });

    let db = ctx.input.database || ctx.config.database;
    let organicKeywords: Record<string, unknown>[] | undefined;
    let paidKeywords: Record<string, unknown>[] | undefined;

    if (ctx.input.searchType === 'organic' || ctx.input.searchType === 'both') {
      let results = await client.getDomainOrganic({
        domain: ctx.input.domain,
        database: db,
        displayLimit: ctx.input.limit,
        displayOffset: ctx.input.offset,
        displaySort: ctx.input.sortBy,
        displayFilter: ctx.input.filter
      });
      organicKeywords = transformResults(results);
    }

    if (ctx.input.searchType === 'paid' || ctx.input.searchType === 'both') {
      let results = await client.getDomainAdwords({
        domain: ctx.input.domain,
        database: db,
        displayLimit: ctx.input.limit,
        displayOffset: ctx.input.offset,
        displaySort: ctx.input.sortBy,
        displayFilter: ctx.input.filter
      });
      paidKeywords = transformResults(results);
    }

    let parts: string[] = [];
    if (organicKeywords) parts.push(`${organicKeywords.length} organic keywords`);
    if (paidKeywords) parts.push(`${paidKeywords.length} paid keywords`);

    return {
      output: {
        organicKeywords,
        paidKeywords
      },
      message: `Retrieved ${parts.join(' and ')} for **${ctx.input.domain}** (database: ${db}).`
    };
  })
  .build();
