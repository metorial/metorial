import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let analyzeDomain = SlateTool.create(spec, {
  name: 'Analyze Domain',
  key: 'analyze_domain',
  description: `Retrieve a comprehensive overview of a domain or URL including Domain Rating, backlink statistics, outlink statistics, and organic traffic metrics. Combines multiple Site Explorer data points into a single overview.
Use this to quickly assess a website's SEO authority, link profile strength, and organic search presence.`,
  constraints: [
    'Consumes API units (minimum 50 per sub-request).',
    'Rate limited to 60 requests per minute.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      target: z
        .string()
        .describe(
          'Domain or URL to analyze (e.g., "ahrefs.com" or "https://example.com/page")'
        ),
      date: z
        .string()
        .optional()
        .describe('Date for the snapshot in YYYY-MM-DD format. Defaults to today.'),
      mode: z
        .enum(['exact', 'domain', 'subdomains', 'prefix'])
        .optional()
        .describe(
          'Target mode: "exact" for exact URL, "domain" for root domain only, "subdomains" for domain with all subdomains, "prefix" for URL prefix. Defaults to "subdomains".'
        )
    })
  )
  .output(
    z.object({
      domainRating: z.any().describe('Domain Rating score and Ahrefs rank'),
      backlinksStats: z
        .any()
        .describe('Backlink profile statistics including total backlinks, referring domains'),
      outlinksStats: z.any().describe('Outgoing link statistics'),
      metrics: z
        .any()
        .describe('SEO metrics including organic keywords, traffic, and traffic value')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params = {
      target: ctx.input.target,
      date: ctx.input.date,
      mode: ctx.input.mode
    };

    let [domainRating, backlinksStats, outlinksStats, metrics] = await Promise.all([
      client.getDomainRating(params),
      client.getBacklinksStats(params),
      client.getOutlinksStats(params),
      client.getMetrics(params)
    ]);

    return {
      output: {
        domainRating,
        backlinksStats,
        outlinksStats,
        metrics
      },
      message: `Retrieved domain analysis for **${ctx.input.target}**.`
    };
  })
  .build();
