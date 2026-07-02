import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let discoverSitemap = SlateTool.create(spec, {
  name: 'Discover Sitemap',
  key: 'discover_sitemap',
  description: `Extracts and returns the sitemap structure of a website by discovering URLs from sitemap.xml, robots.txt, and common sitemap locations.
Useful for understanding site organization, URL discovery, and SEO audits before performing a larger crawl.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      websiteUrl: z.string().describe('URL of the website to discover the sitemap for'),
      stealth: z
        .boolean()
        .optional()
        .describe('Enable anti-detection mode for protected sites (adds 4 credits)')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique identifier for this request'),
      status: z.string().describe('Status of the request'),
      websiteUrl: z.string().optional().describe('The website that was analyzed'),
      urls: z.array(z.string()).describe('List of URLs discovered from the sitemap'),
      error: z.string().nullable().optional().describe('Error message if the request failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.sitemap({
      websiteUrl: ctx.input.websiteUrl,
      stealth: ctx.input.stealth
    });

    let urlCount = (response.urls || []).length;

    return {
      output: {
        requestId: response.request_id,
        status: response.status,
        websiteUrl: response.website_url,
        urls: response.urls || [],
        error: response.error
      },
      message: `Discovered sitemap for **${ctx.input.websiteUrl}**. Found **${urlCount}** URL(s).`
    };
  })
  .build();
