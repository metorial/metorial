import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDomainHistory = SlateTool.create(spec, {
  name: 'Get Domain History',
  key: 'get_domain_history',
  description: `Retrieve historical SEO metrics for a domain or URL over time. Supports multiple history types: referring domains, URL rating, organic metrics, keyword counts, pages, and total search volume.
Use to track trends and analyze how a site's SEO profile has changed over time.`,
  instructions: [
    'Choose the appropriate "historyType" to get the specific historical data you need.',
    'Provide dateFrom and dateTo to scope the time range. If omitted, the API returns all available history.'
  ],
  constraints: [
    'Consumes API units (minimum 50 per request).',
    'Rate limited to 60 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Domain or URL to get history for'),
      historyType: z
        .enum([
          'referring-domains',
          'url-rating',
          'metrics',
          'keywords',
          'pages',
          'total-search-volume'
        ])
        .describe('Type of historical data to retrieve'),
      dateFrom: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      dateTo: z.string().optional().describe('End date in YYYY-MM-DD format'),
      mode: z
        .enum(['exact', 'domain', 'subdomains', 'prefix'])
        .optional()
        .describe('Target mode'),
      country: z
        .string()
        .optional()
        .describe(
          'Two-letter country code (applicable for keywords and total-search-volume history)'
        )
    })
  )
  .output(
    z.object({
      history: z.any().describe('Historical data points over the specified time range')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let baseParams = {
      target: ctx.input.target,
      date_from: ctx.input.dateFrom,
      date_to: ctx.input.dateTo,
      mode: ctx.input.mode
    };

    let result: any;
    switch (ctx.input.historyType) {
      case 'referring-domains':
        result = await client.getReferringDomainsHistory(baseParams);
        break;
      case 'url-rating':
        result = await client.getUrlRatingHistory(baseParams);
        break;
      case 'metrics':
        result = await client.getMetricsHistory(baseParams);
        break;
      case 'keywords':
        result = await client.getKeywordsHistory({
          ...baseParams,
          country: ctx.input.country
        });
        break;
      case 'pages':
        result = await client.getPagesHistory(baseParams);
        break;
      case 'total-search-volume':
        result = await client.getTotalSearchVolumeHistory({
          ...baseParams,
          country: ctx.input.country
        });
        break;
    }

    return {
      output: {
        history: result
      },
      message: `Retrieved ${ctx.input.historyType} history for **${ctx.input.target}**.`
    };
  })
  .build();
