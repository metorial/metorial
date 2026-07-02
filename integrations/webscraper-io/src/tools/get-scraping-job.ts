import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getScrapingJob = SlateTool.create(spec, {
  name: 'Get Scraping Job',
  key: 'get_scraping_job',
  description: `Retrieve the full status and statistics of a scraping job, including page counts, execution progress, and timing information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scrapingJobId: z.number().describe('ID of the scraping job to retrieve')
    })
  )
  .output(
    z.object({
      scrapingJobId: z.number().describe('ID of the scraping job'),
      customId: z.string().optional().describe('Custom identifier if one was set'),
      sitemapName: z.string().describe('Name of the associated sitemap'),
      sitemapId: z.number().describe('ID of the associated sitemap'),
      status: z
        .string()
        .describe(
          'Job status: waiting-to-be-scheduled, scheduling, scheduled, started, finished, failed, or stopped'
        ),
      pagesScheduled: z.number().describe('Number of pages scheduled for scraping'),
      pagesExecuted: z.number().describe('Number of pages successfully scraped'),
      pagesFailed: z.number().describe('Number of pages that failed'),
      pagesEmpty: z.number().describe('Number of pages that returned empty data'),
      pagesNoValue: z.number().describe('Number of pages with no extracted values'),
      storedRecordCount: z.number().describe('Total number of data records stored'),
      requestInterval: z.number().describe('Delay between requests in milliseconds'),
      pageLoadDelay: z.number().describe('Page load delay in milliseconds'),
      driver: z.string().describe('Driver used: fast or fulljs'),
      timeCreated: z.number().describe('Unix timestamp when the job was created'),
      scrapingDuration: z.number().optional().describe('Duration of scraping in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let job = await client.getScrapingJob(ctx.input.scrapingJobId);

    return {
      output: {
        scrapingJobId: job.id,
        customId: job.custom_id || undefined,
        sitemapName: job.sitemap_name,
        sitemapId: job.sitemap_id,
        status: job.status,
        pagesScheduled: job.jobs_scheduled,
        pagesExecuted: job.jobs_executed,
        pagesFailed: job.jobs_failed,
        pagesEmpty: job.jobs_empty,
        pagesNoValue: job.jobs_no_value,
        storedRecordCount: job.stored_record_count,
        requestInterval: job.request_interval,
        pageLoadDelay: job.page_load_delay,
        driver: job.driver,
        timeCreated: job.time_created,
        scrapingDuration: job.scraping_duration
      },
      message: `Scraping job \`${job.id}\` is **${job.status}** — ${job.stored_record_count} records stored, ${job.jobs_executed}/${job.jobs_scheduled} pages executed.`
    };
  })
  .build();
