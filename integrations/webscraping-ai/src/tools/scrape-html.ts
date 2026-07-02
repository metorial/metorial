import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { scrapingOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let scrapeHtml = SlateTool.create(spec, {
  name: 'Scrape HTML',
  key: 'scrape_html',
  description: `Fetch the full rendered HTML of any webpage. Supports JavaScript rendering via headless Chromium, proxy rotation, geo-targeting, device emulation, and custom headers.
Use POST mode to submit form data or interact with target page APIs. Optionally execute custom JavaScript on the page before retrieving the HTML.`,
  instructions: [
    'Set **js** to false for static sites to reduce credit usage and improve speed.',
    'Use **waitFor** with a CSS selector if the page loads content dynamically after initial render.',
    'Use **POST** method with a **requestBody** to submit forms or interact with target page APIs.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe(
          'The full URL of the webpage to scrape (must include protocol, e.g. https://).'
        ),
      method: z
        .enum(['GET', 'POST'])
        .optional()
        .describe('HTTP method to use. Defaults to GET. Use POST for form submissions.'),
      requestBody: z
        .string()
        .optional()
        .describe('Request body for POST requests (e.g. form data or JSON string).'),
      ...scrapingOptionsSchema
    })
  )
  .output(
    z.object({
      html: z.string().describe('The full HTML content of the webpage.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let options = {
      url: ctx.input.url,
      js: ctx.input.js,
      jsTimeout: ctx.input.jsTimeout,
      timeout: ctx.input.timeout,
      waitFor: ctx.input.waitFor,
      proxy: ctx.input.proxy,
      country: ctx.input.country,
      device: ctx.input.device,
      headers: ctx.input.headers,
      jsScript: ctx.input.jsScript,
      customProxy: ctx.input.customProxy,
      errorOn404: ctx.input.errorOn404,
      errorOnRedirect: ctx.input.errorOnRedirect
    };

    let html: string;
    if (ctx.input.method === 'POST') {
      html = await client.postHtml({ ...options, body: ctx.input.requestBody });
    } else {
      html = await client.getHtml(options);
    }

    return {
      output: { html },
      message: `Successfully scraped HTML from **${ctx.input.url}** (${html.length} characters).`
    };
  })
  .build();
