import { SlateTool } from 'slates';
import { z } from 'zod';
import { DiffbotClient } from '../lib/client';
import { spec } from '../spec';

let crawlJobSchema = z
  .object({
    jobName: z.string().optional().describe('Name of the crawl job'),
    jobStatus: z.string().optional().describe('Current status of the crawl'),
    sentDone: z.boolean().optional().describe('Whether the crawl has finished sending URLs'),
    objectsFound: z.number().optional().describe('Number of objects found'),
    urlsHarvested: z.number().optional().describe('Number of URLs discovered'),
    pageCrawlAttempts: z.number().optional().describe('Number of pages attempted'),
    pageCrawlSuccesses: z.number().optional().describe('Number of pages successfully crawled'),
    pageProcessAttempts: z
      .number()
      .optional()
      .describe('Number of pages attempted for processing'),
    pageProcessSuccesses: z
      .number()
      .optional()
      .describe('Number of pages successfully processed'),
    maxToCrawl: z.number().optional().describe('Maximum pages to crawl'),
    maxToProcess: z.number().optional().describe('Maximum pages to process'),
    jobCreationTimeUTC: z.number().optional().describe('Job creation time (UTC timestamp)'),
    jobCompletionTimeUTC: z
      .number()
      .optional()
      .describe('Job completion time (UTC timestamp)'),
    downloadJson: z.string().optional().describe('URL to download results as JSON'),
    downloadUrls: z.string().optional().describe('URL to download crawled URLs'),
    notifyWebhook: z.string().optional().describe('Configured webhook notification URL')
  })
  .passthrough();

export let manageCrawl = SlateTool.create(spec, {
  name: 'Manage Crawl',
  key: 'manage_crawl',
  description: `Create, monitor, control, and retrieve results from Diffbot web crawl jobs. Crawls spider websites from seed URLs, discover linked pages, and process them through Diffbot's extraction APIs. Supports creating new crawls, checking status, pausing/resuming, restarting, deleting, and listing all crawl jobs.`,
  instructions: [
    'Set **action** to "create" and provide seed URLs to start a new crawl.',
    'Use "status" to check progress of a running crawl.',
    'Use "list" to see all crawl jobs on your account.',
    'Use "results" to download extracted data from a completed crawl.'
  ],
  constraints: ['Crawl job names must be unique within your account.']
})
  .input(
    z.object({
      action: z
        .enum(['create', 'status', 'list', 'pause', 'resume', 'restart', 'delete', 'results'])
        .describe('Action to perform on the crawl job'),
      crawlName: z
        .string()
        .optional()
        .describe('Name of the crawl job (required for all actions except "list")'),
      seeds: z
        .array(z.string())
        .optional()
        .describe('Seed URLs to start crawling from (required for "create")'),
      extractionType: z
        .enum([
          'analyze',
          'article',
          'product',
          'discussion',
          'image',
          'video',
          'list',
          'event',
          'job'
        ])
        .optional()
        .describe('Type of extraction to apply to crawled pages'),
      maxToCrawl: z.number().optional().describe('Maximum number of pages to crawl'),
      maxToProcess: z
        .number()
        .optional()
        .describe('Maximum number of pages to process through extraction'),
      maxHops: z.number().optional().describe('Maximum link depth to follow from seed URLs'),
      urlCrawlPattern: z
        .string()
        .optional()
        .describe('Regex pattern to filter which URLs to crawl'),
      urlProcessPattern: z
        .string()
        .optional()
        .describe('Regex pattern to filter which URLs to process'),
      repeat: z.number().optional().describe('Set to 1 to enable recurring crawls'),
      repeatFrequency: z.number().optional().describe('Frequency of recurring crawls in days'),
      notifyWebhook: z
        .string()
        .optional()
        .describe('Webhook URL to notify when crawl completes'),
      onlyProcessIfNew: z
        .boolean()
        .optional()
        .describe('Only process pages not previously crawled'),
      resultCount: z
        .number()
        .optional()
        .describe('Number of results to return (for "results" action)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      crawlJob: crawlJobSchema.optional().describe('Crawl job details'),
      crawlJobs: z
        .array(crawlJobSchema)
        .optional()
        .describe('List of all crawl jobs (for "list" action)'),
      results: z.any().optional().describe('Extracted results data (for "results" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiffbotClient({ token: ctx.auth.token });
    let { action, crawlName } = ctx.input;

    if (action === 'list') {
      let result = await client.listCrawls();
      let jobs = result.jobs || [];
      return {
        output: {
          success: true,
          crawlJobs: jobs
        },
        message: `Found **${jobs.length}** crawl job(s).`
      };
    }

    if (!crawlName) {
      throw new Error('crawlName is required for this action.');
    }

    if (action === 'create') {
      if (!ctx.input.seeds || ctx.input.seeds.length === 0) {
        throw new Error('At least one seed URL is required to create a crawl.');
      }

      let result = await client.createCrawl({
        name: crawlName,
        seeds: ctx.input.seeds,
        apiType: ctx.input.extractionType,
        maxToCrawl: ctx.input.maxToCrawl,
        maxToProcess: ctx.input.maxToProcess,
        maxHops: ctx.input.maxHops,
        urlCrawlPattern: ctx.input.urlCrawlPattern,
        urlProcessPattern: ctx.input.urlProcessPattern,
        repeat: ctx.input.repeat,
        repeatFrequency: ctx.input.repeatFrequency,
        notifyWebhook: ctx.input.notifyWebhook,
        onlyProcessIfNew: ctx.input.onlyProcessIfNew
      });

      let job = result.jobs?.[0] || result;

      return {
        output: {
          success: true,
          crawlJob: job
        },
        message: `Created crawl job **${crawlName}** with ${ctx.input.seeds.length} seed URL(s).`
      };
    }

    if (action === 'status') {
      let result = await client.getCrawlStatus(crawlName);
      let job = result.jobs?.[0] || result;
      return {
        output: {
          success: true,
          crawlJob: job
        },
        message: `Crawl **${crawlName}** status: **${job.jobStatus?.message || job.jobStatus || 'unknown'}**.`
      };
    }

    if (action === 'pause') {
      let result = await client.pauseCrawl(crawlName);
      let job = result.jobs?.[0] || result;
      return {
        output: {
          success: true,
          crawlJob: job
        },
        message: `Paused crawl **${crawlName}**.`
      };
    }

    if (action === 'resume') {
      let result = await client.resumeCrawl(crawlName);
      let job = result.jobs?.[0] || result;
      return {
        output: {
          success: true,
          crawlJob: job
        },
        message: `Resumed crawl **${crawlName}**.`
      };
    }

    if (action === 'restart') {
      let result = await client.restartCrawl(crawlName);
      let job = result.jobs?.[0] || result;
      return {
        output: {
          success: true,
          crawlJob: job
        },
        message: `Restarted crawl **${crawlName}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteCrawl(crawlName);
      return {
        output: {
          success: true
        },
        message: `Deleted crawl **${crawlName}**.`
      };
    }

    if (action === 'results') {
      let results = await client.getCrawlResults(crawlName, undefined, ctx.input.resultCount);
      return {
        output: {
          success: true,
          results
        },
        message: `Retrieved results for crawl **${crawlName}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
