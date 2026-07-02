import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeExtended = SlateTool.create(spec, {
  name: 'Scrape Extended',
  key: 'scrape_extended',
  description: `Scrape a web page and return extended JSON output including HTML, plain text, cookies, response status code, headers, XHR requests, and iframes.
Use this when you need more than just the page HTML — such as inspecting API calls made by the page (XHRs), reading response cookies/headers, or extracting iframe content.`,
  instructions: [
    'The `jsSnippet` parameter should be provided as a **plain JavaScript string** — it will be automatically Base64-encoded before sending to the API.',
    'XHR data is especially useful for discovering underlying API endpoints used by single-page applications.'
  ],
  constraints: [
    'Timeout must be between 5 and 60 seconds.',
    'Credit cost follows the same rules as standard scraping.'
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
        .describe('Enable headless browser rendering. Defaults to true.'),
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
        .describe('Custom HTTP headers to send with the request (without the "ant-" prefix)')
    })
  )
  .output(
    z.object({
      html: z.string().describe('The full HTML content of the scraped page'),
      text: z.string().describe('Plain text representation of the page content'),
      cookies: z.string().describe('Response cookies in format: name1=value1;name2=value2'),
      statusCode: z.number().describe('HTTP status code of the target page response'),
      headers: z
        .array(z.object({ name: z.string(), value: z.string() }))
        .describe('Response headers from the target page'),
      xhrs: z
        .array(
          z.object({
            url: z.string().describe('URL of the XHR request'),
            status: z.number().describe('HTTP status of the XHR response'),
            method: z.string().describe('HTTP method used'),
            headers: z.record(z.string(), z.string()).describe('XHR response headers'),
            requestBody: z.string().describe('Body sent in the XHR request'),
            body: z.string().describe('Response body of the XHR')
          })
        )
        .describe('XHR/API requests captured during page loading'),
      iframes: z
        .array(
          z.object({
            src: z.string().describe('Source URL of the iframe'),
            html: z.string().describe('HTML content of the iframe')
          })
        )
        .describe('Iframes found on the page with their content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let jsSnippetEncoded = ctx.input.jsSnippet
      ? Buffer.from(ctx.input.jsSnippet).toString('base64')
      : undefined;

    let result = await client.scrapeExtended({
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
      output: result,
      message: `Successfully scraped **${ctx.input.url}** with extended output — status ${result.statusCode}, ${result.xhrs.length} XHR(s) captured, ${result.iframes.length} iframe(s) found.`
    };
  })
  .build();
