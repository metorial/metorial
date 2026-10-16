import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { normalizeOutput } from '../lib/response';
import { spec } from '../spec';

let scrapeWebsiteOutputSchema = z.object({
  raw: z.any().describe('Full provider response'),
  html: z.string().describe('Extracted HTML content from the webpage')
});

export let scrapeWebsite = SlateTool.create(spec, {
  name: 'Scrape Website',
  key: 'scrape_website',
  description: `Scrape and extract HTML content from any webpage. Supports three modes:
- **Crawler**: Fast HTML extraction with proxy rotation and smart retries (1 credit).
- **Rendering**: Full browser rendering with JavaScript execution, wait conditions, and ad blocking (2 credits).
- **Web Unlocker**: Advanced anti-bot bypass for approved sites protected by Cloudflare, Akamai, PerimeterX, or DataDome (3 credits).`,
  instructions: [
    'Use "crawler" mode for simple static pages. Use "rendering" for JavaScript-heavy SPAs. Use "webunlocker" for sites with anti-bot protection.',
    'For rendering mode, use waitFor with a CSS selector to wait for specific elements to load before extracting HTML.'
  ],
  constraints: [
    'Web Unlocker requires target domains to be whitelisted.',
    'Rendering wait and timeout options add latency; use only what the target page needs.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Full URL of the webpage to scrape'),
      mode: z
        .enum(['crawler', 'rendering', 'webunlocker'])
        .default('crawler')
        .describe('Scraping mode to use'),
      allowRedirects: z
        .boolean()
        .optional()
        .describe('Whether to follow redirects (crawler and webunlocker modes)'),
      returnPageSource: z
        .boolean()
        .optional()
        .describe(
          'Return raw page source instead of parsed HTML (crawler and webunlocker modes)'
        ),
      waitInSeconds: z
        .number()
        .optional()
        .describe('Seconds to wait before capturing content (rendering mode)'),
      waitFor: z
        .string()
        .optional()
        .describe('CSS or XPath selector to wait for before capturing (rendering mode)'),
      blockAds: z.boolean().optional().describe('Block ads during rendering (rendering mode)'),
      timeout: z.number().optional().describe('Request timeout in seconds (rendering mode)')
    })
  )
  .output(scrapeWebsiteOutputSchema)
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let html: string;

    if (ctx.input.mode === 'rendering') {
      html = await client.renderWebsite({
        url: ctx.input.url,
        waitInSeconds: ctx.input.waitInSeconds,
        waitFor: ctx.input.waitFor,
        blockAds: ctx.input.blockAds,
        timeout: ctx.input.timeout
      });
    } else if (ctx.input.mode === 'webunlocker') {
      html = await client.webUnlocker({
        url: ctx.input.url,
        allowRedirects: ctx.input.allowRedirects,
        returnPageSource: ctx.input.returnPageSource
      });
    } else {
      html = await client.crawlWebsite({
        url: ctx.input.url,
        allowRedirects: ctx.input.allowRedirects,
        returnPageSource: ctx.input.returnPageSource
      });
    }

    return {
      output: normalizeOutput(scrapeWebsiteOutputSchema, { raw: html, html }),
      message: `Scraped HTML from **${ctx.input.url}** using **${ctx.input.mode}** mode. Received ${html.length} characters.`
    };
  })
  .build();
