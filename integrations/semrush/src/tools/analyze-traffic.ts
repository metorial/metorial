import { SlateTool } from 'slates';
import { z } from 'zod';
import { SemrushTrendsClient } from '../lib/trends-client';
import { spec } from '../spec';

export let analyzeTraffic = SlateTool.create(spec, {
  name: 'Analyze Traffic',
  key: 'analyze_traffic',
  description: `Analyze website traffic and audience data using the Semrush Trends API. Retrieve traffic summaries, historical trends, traffic sources/destinations, geo distribution, top pages, subdomains, and audience demographics.
Requires a Trends API subscription.`,
  instructions: [
    'For traffic summary, you can provide up to 200 domains to compare side by side.',
    'Use reportType to select the specific traffic report you need.',
    'The displayDate parameter accepts "YYYY-MM-01" format for monthly data.'
  ],
  constraints: [
    'Requires a separate Semrush Trends API subscription.',
    'Traffic summary supports up to 200 domains; other reports support a single domain.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      targets: z
        .union([
          z.string().describe('A single domain to analyze'),
          z
            .array(z.string())
            .max(200)
            .describe('Multiple domains for traffic summary comparison')
        ])
        .describe('Domain(s) to analyze'),
      reportType: z
        .enum([
          'summary',
          'history',
          'sources',
          'destinations',
          'geo',
          'top_pages',
          'subdomains',
          'demographics'
        ])
        .default('summary')
        .describe('Type of traffic report'),
      displayDate: z.string().optional().describe('Report date in "YYYY-MM-01" format'),
      country: z.string().optional().describe('Country code filter (e.g., "us", "gb")'),
      granularity: z
        .string()
        .optional()
        .describe('Time granularity for history report (daily, weekly, monthly)'),
      limit: z.number().optional().default(50).describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      trafficData: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Traffic data matching the requested report type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SemrushTrendsClient({
      token: ctx.auth.token
    });

    let targetsArray = Array.isArray(ctx.input.targets)
      ? ctx.input.targets
      : [ctx.input.targets];
    let singleTarget = targetsArray[0]!;

    let results: Record<string, unknown>[];

    switch (ctx.input.reportType) {
      case 'summary':
        results = await client.getTrafficSummary({
          targets: targetsArray,
          displayDate: ctx.input.displayDate,
          country: ctx.input.country,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      case 'history':
        results = await client.getTrafficHistory({
          target: singleTarget,
          displayDate: ctx.input.displayDate,
          country: ctx.input.country,
          granularity: ctx.input.granularity,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      case 'sources':
        results = await client.getTrafficSources({
          target: singleTarget,
          displayDate: ctx.input.displayDate,
          country: ctx.input.country,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      case 'destinations':
        results = await client.getTrafficDestinations({
          target: singleTarget,
          displayDate: ctx.input.displayDate,
          country: ctx.input.country,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      case 'geo':
        results = await client.getGeoDistribution({
          target: singleTarget,
          displayDate: ctx.input.displayDate,
          country: ctx.input.country,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      case 'top_pages':
        results = await client.getTopPages({
          target: singleTarget,
          displayDate: ctx.input.displayDate,
          country: ctx.input.country,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      case 'subdomains':
        results = await client.getSubdomains({
          target: singleTarget,
          displayDate: ctx.input.displayDate,
          country: ctx.input.country,
          displayLimit: ctx.input.limit,
          displayOffset: ctx.input.offset
        });
        break;

      case 'demographics':
        results = await client.getAudienceDemographics({
          target: singleTarget,
          displayDate: ctx.input.displayDate,
          country: ctx.input.country
        });
        break;

      default:
        throw new Error(`Unknown report type: ${ctx.input.reportType}`);
    }

    return {
      output: {
        trafficData: results
      },
      message: `Retrieved ${ctx.input.reportType} traffic data for ${targetsArray.length > 1 ? `${targetsArray.length} domains` : `**${singleTarget}**`}: ${results.length} results.`
    };
  })
  .build();
