import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapingClient } from '../lib/scraping-client';
import { spec } from '../spec';

export let createScrapeTask = SlateTool.create(spec, {
  name: 'Create Async Scrape Task',
  key: 'create_scrape_task',
  description: `Submit an asynchronous scraping task to the Decodo Web Scraping API. Use this for long-running scrapes or when you want results delivered via callback URL. Returns a task ID that can be used to check status and retrieve results later.`,
  instructions: [
    'Use the same target templates and parameters as the real-time scrape tool.',
    'Optionally provide a **callbackUrl** to receive results via webhook when the task completes.',
    'Use the **Get Scrape Task Results** tool to retrieve results once the task is complete.'
  ],
  constraints: [
    'Async task results remain accessible for 24 hours.',
    'Requires Basic Auth (Web Scraping API credentials).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().optional().describe('Target URL to scrape'),
      query: z.string().optional().describe('Search query or product ID for target templates'),
      target: z
        .enum([
          'universal',
          'amazon_url',
          'amazon_product',
          'amazon_pricing',
          'amazon_search',
          'amazon_bestsellers',
          'amazon_sellers',
          'google_url',
          'google_search',
          'google_ads',
          'google_ai_mode',
          'google_lens',
          'google_travel_hotels',
          'bing_url',
          'bing_search',
          'walmart_url',
          'walmart_product',
          'walmart_search',
          'target_url',
          'target_product',
          'target_search',
          'reddit_post',
          'reddit_subreddit',
          'reddit_user',
          'tiktok_post',
          'tiktok_shop_product',
          'tiktok_shop_search',
          'tiktok_shop_url',
          'youtube_metadata',
          'youtube_transcript',
          'youtube_subtitles',
          'youtube_channel',
          'youtube_search',
          'chatgpt',
          'perplexity'
        ])
        .default('universal')
        .describe('Target template name'),
      parse: z
        .boolean()
        .optional()
        .describe('When true, returns structured JSON instead of raw HTML'),
      markdown: z
        .boolean()
        .optional()
        .describe('When true, returns Markdown-formatted output'),
      headless: z.enum(['html', 'png']).optional().describe('JavaScript rendering mode'),
      geo: z.string().optional().describe('Geographic location for the request'),
      locale: z.string().optional().describe('Language/locale code'),
      deviceType: z
        .enum([
          'desktop',
          'desktop_chrome',
          'desktop_firefox',
          'mobile',
          'mobile_android',
          'mobile_ios'
        ])
        .optional()
        .describe('Device type to emulate'),
      callbackUrl: z
        .string()
        .optional()
        .describe('Webhook URL to receive results when the task completes'),
      passthrough: z
        .string()
        .optional()
        .describe('Arbitrary string returned in the callback for verification')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Async task ID for retrieving results'),
      status: z.string().describe('Current task status'),
      url: z.string().describe('URL being scraped'),
      target: z.string().describe('Target template used'),
      createdAt: z.string().describe('Task creation timestamp'),
      updatedAt: z.string().describe('Task update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapingClient(ctx.auth.token);

    ctx.info(`Creating async scrape task for target="${ctx.input.target}"`);

    let task = await client.createAsyncTask({
      url: ctx.input.url,
      query: ctx.input.query,
      target: ctx.input.target,
      parse: ctx.input.parse,
      markdown: ctx.input.markdown,
      headless: ctx.input.headless,
      geo: ctx.input.geo,
      locale: ctx.input.locale,
      deviceType: ctx.input.deviceType,
      callbackUrl: ctx.input.callbackUrl,
      passthrough: ctx.input.passthrough
    });

    return {
      output: task,
      message: `Async scrape task created with ID \`${task.taskId}\`. Status: **${task.status}**. ${ctx.input.callbackUrl ? `Results will be delivered to ${ctx.input.callbackUrl}.` : 'Use Get Scrape Task Results to retrieve results.'}`
    };
  })
  .build();

export let getScrapeTaskResults = SlateTool.create(spec, {
  name: 'Get Scrape Task Results',
  key: 'get_scrape_task_results',
  description: `Retrieve the status and results of an asynchronous scraping task. Use after creating a task with **Create Async Scrape Task** to check completion and fetch scraped data.`,
  constraints: [
    'Results remain accessible for 24 hours after the task was created.',
    'Requires Basic Auth (Web Scraping API credentials).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Async task ID returned by Create Async Scrape Task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID'),
      status: z.string().describe('Current task status'),
      url: z.string().describe('URL being scraped'),
      target: z.string().describe('Target template used'),
      createdAt: z.string().describe('Task creation timestamp'),
      updatedAt: z.string().describe('Task update timestamp'),
      results: z
        .array(
          z.object({
            content: z.any().describe('Scraped content'),
            headers: z.record(z.string(), z.string()).describe('Response headers'),
            cookies: z.array(z.any()).describe('Response cookies'),
            statusCode: z.number().describe('HTTP status code'),
            taskId: z.string().describe('Internal task ID'),
            createdAt: z.string().describe('Result creation timestamp'),
            updatedAt: z.string().describe('Result update timestamp')
          })
        )
        .optional()
        .describe('Scraping results if task is complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapingClient(ctx.auth.token);

    ctx.info(`Fetching results for task ${ctx.input.taskId}`);

    let status = await client.getAsyncTaskStatus(ctx.input.taskId);
    let results: any[] | undefined;

    if (status.status === 'done') {
      let resultData = await client.getAsyncTaskResults(ctx.input.taskId);
      results = resultData.results;
    }

    return {
      output: {
        ...status,
        results
      },
      message: `Task \`${ctx.input.taskId}\` status: **${status.status}**. ${results ? `Retrieved **${results.length}** result(s).` : 'Results not yet available.'}`
    };
  })
  .build();
