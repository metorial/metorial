import { SlateTool } from 'slates';
import { z } from 'zod';
import { AbstractClient } from '../lib/client';
import { spec } from '../spec';

export let scrapeWebsite = SlateTool.create(spec, {
  name: 'Scrape Website',
  key: 'scrape_website',
  description: `Scrapes a website and returns its rendered HTML content. Supports JavaScript rendering for dynamic pages and proxy options for geo-restricted content.`,
  constraints: [
    'Large pages may return truncated content.',
    'JavaScript rendering increases response time.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to scrape'),
      renderJs: z
        .boolean()
        .optional()
        .describe(
          'Whether to render JavaScript before returning content. Useful for SPAs and dynamic sites.'
        ),
      proxyCountry: z
        .string()
        .optional()
        .describe('Country code to proxy the request through (e.g. "US", "GB")'),
      premiumProxy: z
        .boolean()
        .optional()
        .describe('Whether to use a premium residential proxy for better success rates')
    })
  )
  .output(
    z.object({
      url: z.string().describe('The URL that was scraped'),
      content: z.string().optional().describe('The rendered HTML content of the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AbstractClient(ctx.auth);

    let result = await client.scrapeWebsite({
      url: ctx.input.url,
      renderJs: ctx.input.renderJs,
      proxyCountry: ctx.input.proxyCountry,
      premiumProxy: ctx.input.premiumProxy
    });

    let content =
      typeof result === 'string'
        ? result
        : (result?.body ?? result?.html ?? JSON.stringify(result));

    return {
      output: {
        url: ctx.input.url,
        content
      },
      message: `Scraped **${ctx.input.url}** — returned ${content ? content.length : 0} characters of content.`
    };
  })
  .build();
