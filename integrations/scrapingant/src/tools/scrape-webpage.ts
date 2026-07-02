import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeWebpage = SlateTool.create(spec, {
  name: 'Scrape Webpage',
  key: 'scrape_webpage',
  description: `Scrape a web page and return its rendered HTML content. ScrapingAnt handles JavaScript rendering, anti-bot bypass (CAPTCHA, Cloudflare), and proxy rotation automatically.
Use this to retrieve the full HTML of any webpage, optionally with custom browser settings, proxy configuration, or JavaScript execution.`,
  instructions: [
    'The `jsSnippet` parameter should be provided as a **plain JavaScript string** — it will be automatically Base64-encoded before sending to the API.',
    'Use `blockResources` to reduce page load time and credit cost by preventing unnecessary resources from loading.',
    'Set `browser` to `false` to skip headless browser rendering and reduce credit cost (1 credit instead of 10).'
  ],
  constraints: [
    'Timeout must be between 5 and 60 seconds.',
    'Requests with browser rendering enabled cost 10 API credits; without browser costs 1 credit.',
    'Residential proxy requests cost 25 API credits.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the web page to scrape'),
      browser: z
        .boolean()
        .optional()
        .describe(
          'Enable headless browser rendering. Defaults to true. Set to false to reduce credit cost.'
        ),
      timeout: z
        .number()
        .min(5)
        .max(60)
        .optional()
        .describe('Request timeout in seconds (5-60). Defaults to 60.'),
      returnPageSource: z
        .boolean()
        .optional()
        .describe(
          'Return the original server HTML before any browser-side JavaScript modifications'
        ),
      cookies: z
        .string()
        .optional()
        .describe(
          'Custom cookies in format: cookie_name1=cookie_value1;cookie_name2=cookie_value2'
        ),
      jsSnippet: z
        .string()
        .optional()
        .describe(
          'Plain JavaScript code to execute on the page after it loads. Will be Base64-encoded automatically.'
        ),
      proxyType: z
        .enum(['datacenter', 'residential'])
        .optional()
        .describe('Proxy type to use. Datacenter is default and cheapest.'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Two-letter country code for geo-targeted proxy (e.g. "US", "GB", "DE")'),
      waitForSelector: z
        .string()
        .optional()
        .describe('CSS selector to wait for before returning results'),
      blockResources: z
        .array(
          z.enum([
            'document',
            'stylesheet',
            'image',
            'media',
            'font',
            'script',
            'texttrack',
            'xhr',
            'fetch',
            'eventsource',
            'websocket',
            'manifest',
            'other'
          ])
        )
        .optional()
        .describe('Resource types to block the browser from loading'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Custom HTTP headers to send with the request (without the "ant-" prefix — it will be added automatically)'
        )
    })
  )
  .output(
    z.object({
      html: z.string().describe('The rendered HTML content of the scraped web page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let jsSnippetEncoded = ctx.input.jsSnippet
      ? Buffer.from(ctx.input.jsSnippet).toString('base64')
      : undefined;

    let html = await client.scrapeGeneral({
      url: ctx.input.url,
      browser: ctx.input.browser,
      timeout: ctx.input.timeout,
      returnPageSource: ctx.input.returnPageSource,
      cookies: ctx.input.cookies,
      jsSnippet: jsSnippetEncoded,
      proxyType: ctx.input.proxyType,
      proxyCountry: ctx.input.proxyCountry,
      waitForSelector: ctx.input.waitForSelector,
      blockResources: ctx.input.blockResources,
      customHeaders: ctx.input.customHeaders
    });

    return {
      output: { html },
      message: `Successfully scraped **${ctx.input.url}** — returned ${html.length} characters of HTML content.`
    };
  })
  .build();
