import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteScraperTool = SlateTool.create(spec, {
  name: 'Delete Scraper',
  key: 'delete_scraper',
  description: `Delete a reusable scraper from your Parsera account by its ID. Only scrapers created via the API can be deleted; legacy scrapers cannot be removed this way.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      scraperId: z.string().describe('ID of the scraper to delete')
    })
  )
  .output(
    z.object({
      confirmationMessage: z.string().describe('Confirmation message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let confirmationMessage = await client.deleteScraper(ctx.input.scraperId);

    return {
      output: { confirmationMessage },
      message: `Deleted scraper **${ctx.input.scraperId}**`
    };
  })
  .build();
