import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cookieSchema } from '../lib/schemas';
import { spec } from '../spec';

export let runScraperTool = SlateTool.create(spec, {
  name: 'Run Scraper',
  key: 'run_scraper',
  description: `Run a previously created reusable scraper on one or more URLs. Returns structured data extracted according to the scraper's configured attributes.
Use this after creating a scraper with the **Create Scraper** tool or selecting one with **List Scrapers**. Use run_scraper_async for agentic scrapers or long-running work.`,
  constraints: [
    'Maximum of 100 URLs per run.',
    'Extractor scrapers support up to 100 URLs; agentic scrapers accept one URL per run.',
    'A run still processing after five minutes returns a run ID to poll with get_scraper_run.'
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
      cookies: z.array(cookieSchema).optional().describe('Cookies to send with the requests'),
      parameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Named inputs for an agentic scraper. Call get_scraper to inspect its parameters_schema.'
        )
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
    if (ctx.input.urls.length > 100) {
      throw createApiServiceError('Provide at most 100 URLs per scraper run.');
    }
    let client = new Client({ token: ctx.auth.token });

    let results = await client.runScraper({
      scraperId: ctx.input.scraperId,
      urls: ctx.input.urls,
      proxyCountry: ctx.input.proxyCountry,
      cookies: ctx.input.cookies,
      parameters: ctx.input.parameters
    });

    let count = results.length;

    return {
      output: { results },
      message: `Scraper **${ctx.input.scraperId}** returned **${count}** record(s) from ${ctx.input.urls.length} URL(s)`
    };
  })
  .build();
