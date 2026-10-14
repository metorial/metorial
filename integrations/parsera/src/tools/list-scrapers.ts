import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listScrapersTool = SlateTool.create(spec, {
  name: 'List Scrapers',
  key: 'list_scrapers',
  description: `List reusable scrapers in your Parsera account. Returns their IDs and names, plus type, status, URL, and creation time when available.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      scrapers: z
        .array(
          z.object({
            scraperId: z.string().describe('Unique identifier for the scraper'),
            name: z.string().describe('Name of the scraper'),
            type: z.string().optional().describe('Scraper type: extractor or agentic'),
            status: z
              .string()
              .nullable()
              .optional()
              .describe('Current scraper state, when available'),
            url: z
              .string()
              .nullable()
              .optional()
              .describe('Primary URL configured for this scraper'),
            createdAt: z
              .string()
              .nullable()
              .optional()
              .describe('Creation timestamp from Parsera')
          })
        )
        .describe('List of scrapers in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let scrapers = await client.listScrapers();

    let mapped = scrapers.map(s => ({
      scraperId: s.id,
      name: s.name,
      type: s.type,
      status: s.status,
      url: s.url,
      createdAt: s.created_at
    }));

    return {
      output: { scrapers: mapped },
      message: `Found **${mapped.length}** scraper(s)`
    };
  })
  .build();
