import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listScrapersTool = SlateTool.create(spec, {
  name: 'List Scrapers',
  key: 'list_scrapers',
  description: `List all reusable scrapers in your Parsera account. Returns the ID and name of each scraper.`,
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
            name: z.string().describe('Name of the scraper')
          })
        )
        .describe('List of scrapers in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let scrapers = await client.listScrapers();

    let mapped = (Array.isArray(scrapers) ? scrapers : []).map(s => ({
      scraperId: s.id,
      name: s.name
    }));

    return {
      output: { scrapers: mapped },
      message: `Found **${mapped.length}** scraper(s)`
    };
  })
  .build();
