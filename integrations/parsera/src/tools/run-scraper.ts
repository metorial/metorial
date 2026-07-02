import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cookieSchema = z.object({
  name: z.string().describe('Cookie name'),
  value: z.string().describe('Cookie value'),
  domain: z.string().optional().describe('Cookie domain'),
  path: z.string().optional().describe('Cookie path')
});

export let runScraperTool = SlateTool.create(spec, {
  name: 'Run Scraper',
  key: 'run_scraper',
  description: `Run a previously created reusable scraper on one or more URLs. Returns structured data extracted according to the scraper's configured attributes.
Use this after creating a scraper with the **Create Scraper** tool.`,
  constraints: [
    'Maximum of 100 URLs per run.',
    'The scraper must have generated code. If using code mode, the scraper must be switched to code mode in the Parsera UI.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scraperId: z.string().describe('ID of the scraper to run'),
      urls: z.array(z.string()).min(1).describe('Target URL(s) to scrape, maximum 100'),
      proxyCountry: z.string().optional().describe('Geographic location for proxy routing'),
      cookies: z.array(cookieSchema).optional().describe('Cookies to send with the requests')
    })
  )
  .output(
    z.object({
      results: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of extracted data records from all URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.runScraper({
      scraperId: ctx.input.scraperId,
      urls: ctx.input.urls,
      proxyCountry: ctx.input.proxyCountry,
      cookies: ctx.input.cookies
    });

    let count = Array.isArray(results) ? results.length : 0;

    return {
      output: { results: Array.isArray(results) ? results : [] },
      message: `Scraper **${ctx.input.scraperId}** returned **${count}** record(s) from ${ctx.input.urls.length} URL(s)`
    };
  })
  .build();
