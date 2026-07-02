import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listScrapingJobs = SlateTool.create(spec, {
  name: 'List Scraping Jobs',
  key: 'list_scraping_jobs',
  description: `List scraping jobs with pagination support. Optionally filter by sitemap ID or tag.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      sitemapId: z.number().optional().describe('Filter jobs by sitemap ID'),
      tag: z.string().optional().describe('Filter jobs by tag name')
    })
  )
  .output(
    z.object({
      scrapingJobs: z.array(
        z.object({
          scrapingJobId: z.number().describe('ID of the scraping job'),
          customId: z.string().optional().describe('Custom identifier if set'),
          sitemapName: z.string().describe('Name of the associated sitemap'),
          sitemapId: z.number().describe('ID of the associated sitemap'),
          status: z.string().describe('Current job status'),
          pagesScheduled: z.number().describe('Pages scheduled'),
          pagesExecuted: z.number().describe('Pages executed'),
          pagesFailed: z.number().describe('Pages failed'),
          storedRecordCount: z.number().describe('Records stored'),
          driver: z.string().describe('Driver used'),
          timeCreated: z.number().describe('Unix timestamp when created')
        })
      ),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number'),
      total: z.number().describe('Total number of scraping jobs'),
      perPage: z.number().describe('Jobs per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listScrapingJobs({
      page: ctx.input.page,
      sitemapId: ctx.input.sitemapId,
      tag: ctx.input.tag
    });

    return {
      output: {
        scrapingJobs: result.scrapingJobs.map((j: any) => ({
          scrapingJobId: j.id,
          customId: j.custom_id || undefined,
          sitemapName: j.sitemap_name,
          sitemapId: j.sitemap_id,
          status: j.status,
          pagesScheduled: j.jobs_scheduled,
          pagesExecuted: j.jobs_executed,
          pagesFailed: j.jobs_failed,
          storedRecordCount: j.stored_record_count,
          driver: j.driver,
          timeCreated: j.time_created
        })),
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        total: result.total,
        perPage: result.perPage
      },
      message: `Found **${result.total}** scraping jobs (page ${result.currentPage}/${result.lastPage}).`
    };
  })
  .build();
