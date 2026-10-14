import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrightDataClient } from '../lib/client';
import { spec } from '../spec';

export let listScrapers = SlateTool.create(spec, {
  name: 'List Scrapers',
  key: 'list_scrapers',
  description:
    'Discover available scrapers with dataset IDs, names, domains, collection methods, input schemas, and output fields. Use the returned dataset ID with trigger_scraping_job or scrape_synchronous.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      datasetId: z
        .string()
        .optional()
        .describe('Return only the scraper with this dataset ID.'),
      domain: z
        .string()
        .optional()
        .describe('Filter by the target domain, such as amazon.com.')
    })
  )
  .output(
    z.object({
      scrapers: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Available scrapers and their provider-defined schemas.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrightDataClient({ token: ctx.auth.token });
    let scrapers = await client.listScrapers(ctx.input);
    return { output: { scrapers }, message: `Found **${scrapers.length}** scraper(s).` };
  })
  .build();
