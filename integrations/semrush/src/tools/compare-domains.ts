import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushAnalyticsClient } from '../lib/client';
import { transformResults } from '../lib/csv-parser';
import { spec } from '../spec';

export let compareDomains = SlateTool.create(spec, {
  name: 'Compare Domains',
  key: 'compare_domains',
  description: `Compare keyword overlap between multiple domains (up to 5) to identify shared and unique keyword opportunities.
Returns keywords with position data for each domain, enabling competitive gap analysis.`,
  instructions: [
    'Provide 2-5 domains to compare.',
    'Each result row shows a keyword and the ranking position for each domain.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domains: z
        .array(z.string())
        .min(2)
        .max(5)
        .describe('List of 2-5 domain names to compare'),
      database: z.string().optional().describe('Regional database code (e.g., us, uk, de)'),
      limit: z
        .number()
        .optional()
        .default(50)
        .describe('Maximum number of keywords to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      sharedKeywords: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Keywords with position data for each compared domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushAnalyticsClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      database: ctx.config.database
    });

    let db = ctx.input.database || ctx.config.database;

    let results = await client.getDomainOrganicOrganic({
      domains: ctx.input.domains,
      database: db,
      displayLimit: ctx.input.limit,
      displayOffset: ctx.input.offset
    });

    let sharedKeywords = transformResults(results);

    return {
      output: {
        sharedKeywords
      },
      message: `Compared ${ctx.input.domains.length} domains and found ${sharedKeywords.length} shared keywords (database: ${db}).`
    };
  })
  .build();
