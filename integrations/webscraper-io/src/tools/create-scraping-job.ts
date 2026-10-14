import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createScrapingJob = SlateTool.create(spec, {
  name: 'Create Scraping Job',
  key: 'create_scraping_job',
  description: `Execute a sitemap by creating a new scraping job. Configure the driver, proxy, timing, and optionally override start URLs. The job will begin processing and can be monitored using the Get Scraping Job tool.`,
  instructions: [
    'Use driver "fast" for static pages and "fulljs" for JavaScript-heavy or single-page application sites.',
    'Proxy format is "datacenter-{country}" or "residential-{country}" where country is a 2-letter code (e.g., "us", "gb", "de").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sitemapId: z.number().describe('ID of the sitemap to execute'),
      driver: z
        .enum(['fast', 'fulljs'])
        .optional()
        .describe(
          'Scraping driver: "fast" skips JavaScript, "fulljs" executes JavaScript on pages'
        ),
      pageLoadDelay: z
        .number()
        .optional()
        .describe('Non-negative whole milliseconds after page load; required to create a job'),
      requestInterval: z
        .number()
        .optional()
        .describe(
          'Non-negative whole milliseconds between requests; required to create a job'
        ),
      proxy: z
        .string()
        .optional()
        .describe('Required proxy, e.g. "datacenter-us" or "residential-gb"'),
      priority: z
        .number()
        .optional()
        .describe('Job priority from 1 to 5; the provider default is 3'),
      startUrls: z
        .array(z.string())
        .optional()
        .describe('Override the sitemap start URLs for this specific job'),
      customId: z
        .string()
        .optional()
        .describe('Custom identifier included in webhook notifications for tracking')
    })
  )
  .output(
    z.object({
      scrapingJobId: z.number().describe('ID of the newly created scraping job'),
      customId: z.string().optional().describe('Custom ID if one was provided')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createScrapingJob({
      sitemapId: ctx.input.sitemapId,
      driver: ctx.input.driver,
      pageLoadDelay: ctx.input.pageLoadDelay,
      requestInterval: ctx.input.requestInterval,
      proxy: ctx.input.proxy,
      startUrls: ctx.input.startUrls,
      customId: ctx.input.customId,
      priority: ctx.input.priority
    });

    return {
      output: {
        scrapingJobId: result.id,
        customId: result.custom_id ?? undefined
      },
      message: `Created scraping job \`${result.id}\` for sitemap \`${ctx.input.sitemapId}\`.`
    };
  })
  .build();
