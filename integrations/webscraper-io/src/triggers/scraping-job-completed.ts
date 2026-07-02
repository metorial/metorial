import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapingJobCompleted = SlateTrigger.create(spec, {
  name: 'Scraping Job Completed',
  key: 'scraping_job_completed',
  description:
    'Triggers when a scraping job finishes, is stopped, or fails. Receives webhook notifications from Web Scraper Cloud with job details.'
})
  .input(
    z.object({
      scrapingJobId: z.number().describe('ID of the scraping job'),
      status: z.string().describe('Job status: finished, stopped, or failed'),
      sitemapId: z.number().describe('ID of the associated sitemap'),
      sitemapName: z.string().describe('Name of the associated sitemap'),
      customId: z
        .string()
        .optional()
        .describe('Custom identifier if one was set when creating the job')
    })
  )
  .output(
    z.object({
      scrapingJobId: z.number().describe('ID of the scraping job'),
      status: z.string().describe('Job final status: finished, stopped, or failed'),
      sitemapId: z.number().describe('ID of the associated sitemap'),
      sitemapName: z.string().describe('Name of the associated sitemap'),
      customId: z.string().optional().describe('Custom identifier if one was set'),
      pagesScheduled: z.number().optional().describe('Number of pages that were scheduled'),
      pagesExecuted: z.number().optional().describe('Number of pages successfully scraped'),
      pagesFailed: z.number().optional().describe('Number of pages that failed'),
      pagesEmpty: z.number().optional().describe('Number of pages returning empty data'),
      storedRecordCount: z.number().optional().describe('Total number of stored records'),
      scrapingDuration: z.number().optional().describe('Scraping duration in seconds')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      // Web Scraper sends form-encoded POST data
      let contentType = ctx.request.headers.get('content-type') || '';
      let inputs: Array<{
        scrapingJobId: number;
        status: string;
        sitemapId: number;
        sitemapName: string;
        customId?: string;
      }> = [];

      if (contentType.includes('application/x-www-form-urlencoded')) {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);

        inputs.push({
          scrapingJobId: Number(params.get('scrapingjob_id')),
          status: params.get('status') || '',
          sitemapId: Number(params.get('sitemap_id')),
          sitemapName: params.get('sitemap_name') || '',
          customId: params.get('custom_id') || undefined
        });
      } else {
        // Handle JSON payload as fallback
        let data = (await ctx.request.json()) as any;

        inputs.push({
          scrapingJobId: Number(data.scrapingjob_id),
          status: data.status || '',
          sitemapId: Number(data.sitemap_id),
          sitemapName: data.sitemap_name || '',
          customId: data.custom_id || undefined
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let jobDetails: any = null;

      try {
        let client = new Client(ctx.auth.token);
        jobDetails = await client.getScrapingJob(ctx.input.scrapingJobId);
      } catch {
        // Job details may not be available if it was deleted
      }

      return {
        type: `scraping_job.${ctx.input.status}`,
        id: String(ctx.input.scrapingJobId),
        output: {
          scrapingJobId: ctx.input.scrapingJobId,
          status: ctx.input.status,
          sitemapId: ctx.input.sitemapId,
          sitemapName: ctx.input.sitemapName,
          customId: ctx.input.customId,
          pagesScheduled: jobDetails?.jobs_scheduled,
          pagesExecuted: jobDetails?.jobs_executed,
          pagesFailed: jobDetails?.jobs_failed,
          pagesEmpty: jobDetails?.jobs_empty,
          storedRecordCount: jobDetails?.stored_record_count,
          scrapingDuration: jobDetails?.scraping_duration
        }
      };
    }
  })
  .build();
