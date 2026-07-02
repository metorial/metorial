import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushAnalyticsClient } from '../lib/client';
import { transformResults } from '../lib/csv-parser';
import { spec } from '../spec';

export let getDomainOverview = SlateTool.create(spec, {
  name: 'Get Domain Overview',
  key: 'get_domain_overview',
  description: `Retrieve a comprehensive SEO and PPC overview for a domain including organic/paid keywords count, traffic estimates, cost estimates, and ranking.
Use this to quickly assess a domain's overall search visibility, or compare its organic vs paid performance.
Supports pulling data from different regional databases and retrieving historical trends.`,
  instructions: [
    'Provide a domain name (e.g., "example.com") without protocol prefix.',
    "Set includeHistory to true to get monthly historical data showing how the domain's metrics changed over time."
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to analyze (e.g., "example.com")'),
      database: z
        .string()
        .optional()
        .describe('Regional database code (e.g., us, uk, de). Overrides the global config.'),
      includeHistory: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include historical monthly data'),
      historyLimit: z
        .number()
        .optional()
        .describe('Max number of historical data points to return')
    })
  )
  .output(
    z.object({
      overview: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Current domain overview metrics across databases'),
      allDatabaseRanks: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Rankings across all databases'),
      history: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Historical monthly data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushAnalyticsClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      database: ctx.config.database
    });

    let db = ctx.input.database || ctx.config.database;

    let overview = await client.getDomainOverview({
      domain: ctx.input.domain,
      database: db
    });

    let allDatabaseRanks = await client.getDomainRanks(ctx.input.domain, db);

    let history: Record<string, unknown>[] | undefined;
    if (ctx.input.includeHistory) {
      history = await client.getDomainOverviewHistory({
        domain: ctx.input.domain,
        database: db,
        displayLimit: ctx.input.historyLimit
      });
    }

    return {
      output: {
        overview: transformResults(overview),
        allDatabaseRanks: transformResults(allDatabaseRanks),
        history: history ? transformResults(history) : undefined
      },
      message: `Retrieved domain overview for **${ctx.input.domain}** (database: ${db}).${history ? ` Includes ${history.length} historical data points.` : ''}`
    };
  })
  .build();
