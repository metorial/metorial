import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import {
  scrapeJobDataSchema,
  scrapeOptionsSchema,
  sessionOptionsSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let scrapeWebpage = SlateTool.create(spec, {
  name: 'Scrape Webpage',
  key: 'scrape_webpage',
  description: `Scrape content from a single webpage and return it in structured formats (markdown, HTML, links, screenshot).
Starts a scrape job, waits for completion, and returns the extracted page content.
Supports configurable session options like proxy, stealth mode, and CAPTCHA solving.`,
  instructions: [
    'Provide a full URL including the protocol (https://).',
    'By default returns markdown format. Specify additional formats in scrapeOptions.formats if needed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('Full URL of the webpage to scrape'),
      scrapeOptions: scrapeOptionsSchema,
      sessionOptions: sessionOptionsSchema
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Scrape job identifier'),
      status: z.string().describe('Job status (completed, failed)'),
      scrapedContent: scrapeJobDataSchema.optional().describe('Scraped page content'),
      error: z.string().optional().describe('Error message if job failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });

    let params: Record<string, unknown> = { url: ctx.input.url };
    if (ctx.input.scrapeOptions) params.scrapeOptions = ctx.input.scrapeOptions;
    if (ctx.input.sessionOptions) params.sessionOptions = ctx.input.sessionOptions;

    ctx.info(`Starting scrape job for ${ctx.input.url}`);
    let startResponse = await client.startScrapeJob(params);
    let jobId = startResponse.jobId;

    ctx.progress('Waiting for scrape job to complete...');
    let result = await client.pollForCompletion(
      () => client.getScrapeJobStatus(jobId),
      () => client.getScrapeJobResult(jobId)
    );

    let data = result.data as Record<string, unknown> | undefined;

    return {
      output: {
        jobId,
        status: result.status as string,
        scrapedContent: data
          ? {
              metadata: data.metadata as Record<string, unknown> | undefined,
              markdown: data.markdown as string | undefined,
              html: data.html as string | undefined,
              links: data.links as string[] | undefined,
              screenshot: data.screenshot as string | undefined
            }
          : undefined,
        error: result.error as string | undefined
      },
      message: data?.markdown
        ? `Successfully scraped **${ctx.input.url}**. Retrieved ${(data.markdown as string).length} characters of markdown content.`
        : `Scrape job completed with status: **${result.status}**`
    };
  })
  .build();
