import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getScraperTool = SlateTool.create(spec, {
  name: 'Get Scraper',
  key: 'get_scraper',
  description:
    'Get a reusable scraper’s details and build state. For agentic scrapers, inspect parameters_schema before running the scraper.',
  instructions: [
    'Call list_scrapers to find scraperId and type. Use type "agentic" for agentic scrapers, or "extractor" for extractor scrapers.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      scraperId: z.string().describe('Scraper ID from list_scrapers or create_scraper'),
      type: z
        .enum(['extractor', 'agentic'])
        .optional()
        .describe('Scraper type from list_scrapers. Defaults to extractor.')
    })
  )
  .output(
    z.object({
      scraper: z
        .record(z.string(), z.unknown())
        .describe(
          'Provider scraper details, including template_id, type, and available build state or parameters_schema'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let scraper = await client.getScraper(ctx.input.scraperId, ctx.input.type ?? 'extractor');
    return {
      output: { scraper },
      message: `Retrieved scraper **${ctx.input.scraperId}**`
    };
  })
  .build();
