import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mapWebsiteTool = SlateTool.create(spec, {
  name: 'Map Website',
  key: 'map_website',
  description: `Map a website with Firecrawl v2 and retrieve discovered URLs quickly. Use this before scraping or crawling when you need a site inventory or relevant URLs from a domain.`,
  instructions: [
    'Provide the base URL of the website to map.',
    'Optionally use search to order results by relevance to a topic.',
    'Use limit and sitemap options to control result size and discovery strategy.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The base URL of the website to map'),
      search: z.string().optional().describe('Search term to order URLs by relevance'),
      includeSubdomains: z.boolean().optional().describe('Include URLs from subdomains'),
      ignoreQueryParameters: z.boolean().optional().describe('Exclude URL query parameters'),
      ignoreCache: z.boolean().optional().describe('Bypass cached map results'),
      limit: z.number().optional().describe('Maximum number of URLs to return'),
      timeout: z.number().optional().describe('Map timeout in milliseconds'),
      sitemap: z
        .enum(['skip', 'include', 'only'])
        .optional()
        .describe('How to handle sitemaps'),
      locationCountry: z.string().optional().describe('Country code for mapping location'),
      locationLanguages: z
        .array(z.string())
        .optional()
        .describe('Language tags for mapping location')
    })
  )
  .output(
    z.object({
      links: z
        .array(
          z.object({
            url: z.string().describe('URL found on the website'),
            title: z.string().optional().describe('Page title if available'),
            description: z.string().optional().describe('Page description if available')
          })
        )
        .describe('List of discovered URLs'),
      success: z.boolean().optional().describe('Whether Firecrawl marked the map successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.map({
      url: ctx.input.url,
      search: ctx.input.search,
      includeSubdomains: ctx.input.includeSubdomains,
      ignoreQueryParameters: ctx.input.ignoreQueryParameters,
      ignoreCache: ctx.input.ignoreCache,
      limit: ctx.input.limit,
      timeout: ctx.input.timeout,
      sitemap: ctx.input.sitemap,
      location:
        ctx.input.locationCountry || ctx.input.locationLanguages
          ? {
              country: ctx.input.locationCountry,
              languages: ctx.input.locationLanguages
            }
          : undefined
    });

    let links = (result.links ?? []).map((link: any) => {
      if (typeof link === 'string') {
        return { url: link };
      }

      return {
        url: link.url,
        title: link.title,
        description: link.description
      };
    });

    return {
      output: {
        links,
        success: result.success
      },
      message: `Mapped **${links.length}** URL(s) from **${ctx.input.url}**.`
    };
  });
