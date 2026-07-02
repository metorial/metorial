import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteScrapingJob = SlateTool.create(spec, {
  name: 'Delete Scraping Job',
  key: 'delete_scraping_job',
  description: `Permanently delete a scraping job and its associated data. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      scrapingJobId: z.number().describe('ID of the scraping job to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.deleteScrapingJob(ctx.input.scrapingJobId);

    return {
      output: {
        success: true
      },
      message: `Deleted scraping job \`${ctx.input.scrapingJobId}\`.`
    };
  })
  .build();
