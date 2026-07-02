import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let webScraper = SlateTool.create(spec, {
  name: 'Web Page Scraper',
  key: 'web_page_scraper',
  description: `Scrape any website using a general-purpose web scraping API that handles blockages and CAPTCHAs internally. Supports JavaScript rendering via headless browser, premium residential proxies, and configurable wait times for heavy pages.`,
  instructions: [
    'The URL should be fully encoded before passing it.',
    'Use `renderJs` for pages that rely on client-side JavaScript rendering.',
    'Use `waitMs` along with `renderJs` for pages that need time to fully load.',
    'Enable `premium` for difficult-to-scrape websites that block regular proxies.'
  ],
  constraints: [
    'Maximum wait time is 35,000ms.',
    'Premium proxies cost significantly more credits.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the page to scrape (should be URL-encoded)'),
      renderJs: z
        .boolean()
        .optional()
        .describe('Render JavaScript using a headless browser. Defaults to true.'),
      premium: z
        .boolean()
        .optional()
        .describe('Use premium residential proxies for difficult-to-scrape websites'),
      waitMs: z
        .number()
        .optional()
        .describe(
          'Wait time in milliseconds (0-35000) before returning content. Requires renderJs to be true.'
        ),
      country: z
        .string()
        .optional()
        .describe('Proxy country code in ISO 3166-1 format (e.g., "us", "gb", "de")')
    })
  )
  .output(
    z.object({
      content: z.any().describe('The scraped page content (raw HTML)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.scrapeWebPage({
      url: ctx.input.url,
      renderJs: ctx.input.renderJs,
      premium: ctx.input.premium,
      wait: ctx.input.waitMs,
      country: ctx.input.country
    });

    return {
      output: { content: data },
      message: `Scraped web page at **${ctx.input.url}**.`
    };
  })
  .build();
