import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrowserlessClient } from '../lib/client';
import { spec } from '../spec';
import { requireHttpUrl } from './shared';

export let mapSite = SlateTool.create(spec, {
  name: 'Map Site URLs',
  key: 'map_site',
  description: `Discover URLs on a website with Browserless Map. Returns a deduplicated list of pages with optional title and description metadata, with search relevance, sitemap behavior, geo-targeting, and URL filtering controls.`,
  constraints: ['The Map API is available on Browserless Cloud plans.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Base HTTP or HTTPS URL to discover links from'),
      search: z.string().optional().describe('Search query to order results by relevance'),
      limit: z
        .number()
        .min(1)
        .max(5000)
        .optional()
        .describe('Maximum number of URLs to return'),
      timeout: z.number().optional().describe('Request timeout in milliseconds'),
      sitemap: z
        .enum(['include', 'skip', 'only'])
        .optional()
        .describe('Whether to include, skip, or exclusively use sitemap URLs'),
      includeSubdomains: z.boolean().optional().describe('Include URLs from subdomains'),
      ignoreQueryParameters: z
        .boolean()
        .optional()
        .describe('Deduplicate URLs ignoring query strings'),
      country: z
        .string()
        .optional()
        .describe('Country code for proxy routing, e.g. "us", "gb", or "de"'),
      languages: z
        .array(z.string())
        .optional()
        .describe('Preferred languages for the request'),
      proxy: z
        .enum(['residential', 'datacenter'])
        .optional()
        .describe('Proxy network to route through')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether Browserless reported success'),
      links: z
        .array(
          z.object({
            url: z.string().describe('Discovered URL'),
            title: z.string().optional().describe('Page title, when available'),
            description: z.string().optional().describe('Page description, when available')
          })
        )
        .describe('Discovered URLs')
    })
  )
  .handleInvocation(async ctx => {
    requireHttpUrl(ctx.input.url);

    let client = new BrowserlessClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.map({
      url: ctx.input.url,
      search: ctx.input.search,
      limit: ctx.input.limit,
      timeout: ctx.input.timeout,
      sitemap: ctx.input.sitemap,
      includeSubdomains: ctx.input.includeSubdomains,
      ignoreQueryParameters: ctx.input.ignoreQueryParameters,
      location:
        ctx.input.country || ctx.input.languages
          ? {
              country: ctx.input.country,
              languages: ctx.input.languages
            }
          : undefined,
      proxy: ctx.input.proxy
    });

    let links = Array.isArray(result?.links) ? result.links : [];

    return {
      output: {
        success: result?.success,
        links
      },
      message: `Mapped **${links.length}** URL(s) from ${ctx.input.url}.`
    };
  })
  .build();
