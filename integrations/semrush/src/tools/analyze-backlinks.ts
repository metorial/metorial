import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushAnalyticsClient } from '../lib/client';
import { transformResults } from '../lib/csv-parser';
import { spec } from '../spec';

export let analyzeBacklinks = SlateTool.create(spec, {
  name: 'Analyze Backlinks',
  key: 'analyze_backlinks',
  description: `Analyze the backlink profile of a domain, subdomain, or URL. Retrieve backlink overview metrics, individual backlinks, referring domains, anchor text distribution, and backlink competitors.
Use this for link building research, competitor backlink analysis, and assessing a site's authority.`,
  instructions: [
    'Set targetType to "root_domain" for the full domain, "domain" for a specific subdomain, or "url" for a specific page.',
    'Use reportType to choose which backlink data to retrieve.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Domain, subdomain, or URL to analyze'),
      targetType: z
        .enum(['root_domain', 'domain', 'url'])
        .default('root_domain')
        .describe('Scope of analysis'),
      reportType: z
        .enum(['overview', 'backlinks', 'referring_domains', 'anchors', 'competitors'])
        .default('overview')
        .describe('Type of backlink report'),
      limit: z.number().optional().default(50).describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination'),
      sortBy: z.string().optional().describe('Sort field and order'),
      filter: z.string().optional().describe('Filter expression')
    })
  )
  .output(
    z.object({
      backlinks: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Backlink data matching the requested report type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushAnalyticsClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      database: ctx.config.database
    });

    let results: Record<string, unknown>[];

    switch (ctx.input.reportType) {
      case 'overview':
        results = await client.getBacklinksOverview({
          target: ctx.input.target,
          targetType: ctx.input.targetType
        });
        break;

      case 'backlinks':
        results = await client.getBacklinks({
          target: ctx.input.target,
          targetType: ctx.input.targetType,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset,
          displaySort: ctx.input.sortBy,
          displayFilter: ctx.input.filter
        });
        break;

      case 'referring_domains':
        results = await client.getReferringDomains({
          target: ctx.input.target,
          targetType: ctx.input.targetType,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset,
          displaySort: ctx.input.sortBy,
          displayFilter: ctx.input.filter
        });
        break;

      case 'anchors':
        results = await client.getBacklinksAnchors({
          target: ctx.input.target,
          targetType: ctx.input.targetType,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      case 'competitors':
        results = await client.getBacklinksCompetitors({
          target: ctx.input.target,
          targetType: ctx.input.targetType,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      default:
        throw new Error(`Unknown report type: ${ctx.input.reportType}`);
    }

    let backlinks = transformResults(results);

    return {
      output: {
        backlinks
      },
      message: `Retrieved ${ctx.input.reportType} report for **${ctx.input.target}** (${ctx.input.targetType}): ${backlinks.length} results.`
    };
  })
  .build();
