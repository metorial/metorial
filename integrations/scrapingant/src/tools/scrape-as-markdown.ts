import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeAsMarkdown = SlateTool.create(spec, {
  name: 'Scrape as Markdown',
  key: 'scrape_as_markdown',
  description: `Scrape a web page and return its content converted to Markdown format. Ideal for feeding web content into LLMs, RAG systems, or any text-processing pipeline.
Supports the same browser rendering, proxy, and interaction options as standard scraping.`,
  instructions: [
    'The `jsSnippet` parameter should be provided as a **plain JavaScript string** — it will be automatically Base64-encoded before sending to the API.'
  ],
  constraints: [
    'Timeout must be between 5 and 60 seconds.',
    'Credit cost is the same as standard scraping (10 with browser, 1 without).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL of the web page to scrape and convert to Markdown'),
      browser: z
        .boolean()
        .optional()
        .describe('Enable headless browser rendering. Defaults to true.'),
      timeout: z
        .number()
        .min(5)
        .max(60)
        .optional()
        .describe('Request timeout in seconds (5-60). Defaults to 60.'),
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
        .describe('Custom HTTP headers to send with the request (without the "ant-" prefix)')
    })
  )
  .output(
    z.object({
      url: z.string().describe('The URL that was scraped'),
      markdown: z.string().describe('The page content converted to Markdown format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let jsSnippetEncoded = ctx.input.jsSnippet
      ? Buffer.from(ctx.input.jsSnippet).toString('base64')
      : undefined;

    let result = await client.scrapeMarkdown({
      url: ctx.input.url,
      browser: ctx.input.browser,
      timeout: ctx.input.timeout,
      cookies: ctx.input.cookies,
      jsSnippet: jsSnippetEncoded,
      proxyType: ctx.input.proxyType,
      proxyCountry: ctx.input.proxyCountry,
      waitForSelector: ctx.input.waitForSelector,
      blockResources: ctx.input.blockResources,
      customHeaders: ctx.input.customHeaders
    });

    return {
      output: result,
      message: `Successfully scraped **${ctx.input.url}** and converted to Markdown — ${result.markdown.length} characters.`
    };
  })
  .build();
