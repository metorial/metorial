import { SlateTool } from 'slates';
import { z } from 'zod';
import { ScrapeDoClient } from '../lib/client';
import { spec } from '../spec';

export let createAsyncJob = SlateTool.create(spec, {
  name: 'Create Async Scraping Job',
  key: 'create_async_job',
  description: `Submit a batch of URLs for asynchronous scraping. Returns a job ID to track progress and retrieve results later. Jobs run in a separate thread pool independent from the main API concurrency. Supports all standard scraping parameters including geo-targeting, headless rendering, and webhook delivery.`,
  instructions: [
    'Submit multiple URLs in the targets array to scrape them as a batch.',
    'Use webhookUrl to receive results via webhook instead of polling.',
    'Use the Get Async Job tool to check job status and retrieve results.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      targets: z.array(z.string()).describe('Array of URLs to scrape'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'HEAD', 'DELETE'])
        .optional()
        .describe('HTTP method for all targets'),
      requestBody: z.string().optional().describe('Request body for POST/PUT/PATCH requests'),
      geoCode: z.string().optional().describe('Country code for geo-targeting'),
      regionalGeoCode: z.string().optional().describe('Continent code for regional targeting'),
      super: z.boolean().optional().describe('Enable residential/mobile proxies'),
      headers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers to send with requests'),
      forwardHeaders: z.boolean().optional().describe('Only use the provided headers'),
      sessionId: z.string().optional().describe('Sticky session ID'),
      device: z
        .enum(['desktop', 'mobile', 'tablet'])
        .optional()
        .describe('Device type to emulate'),
      setCookies: z.string().optional().describe('Cookies to include in requests'),
      timeout: z.number().optional().describe('Total timeout in milliseconds'),
      retryTimeout: z
        .number()
        .optional()
        .describe('Retry timeout per request in milliseconds'),
      disableRetry: z.boolean().optional().describe('Disable automatic retries'),
      disableRedirection: z.boolean().optional().describe('Disable following redirects'),
      output: z.enum(['raw', 'markdown']).optional().describe('Output format'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive results via webhook when job completes'),
      webhookHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional headers to send with webhook request'),
      render: z
        .object({
          blockResources: z.boolean().optional().describe('Block CSS, images, fonts'),
          waitUntil: z
            .enum(['domcontentloaded', 'networkidle0', 'networkidle2'])
            .optional()
            .describe('Page load event to wait for'),
          customWait: z.number().optional().describe('Additional wait time in milliseconds'),
          waitSelector: z.string().optional().describe('CSS selector to wait for'),
          returnJSON: z.boolean().optional().describe('Return network requests as JSON'),
          screenshot: z.boolean().optional().describe('Include screenshot'),
          fullScreenshot: z.boolean().optional().describe('Include full-page screenshot'),
          particularScreenshot: z
            .string()
            .optional()
            .describe('CSS selector for partial screenshot')
        })
        .optional()
        .describe('Headless browser rendering options')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique identifier for the created job'),
      taskIds: z.array(z.string()).describe('Array of task IDs, one per target URL'),
      message: z.string().describe('Server response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ScrapeDoClient(ctx.auth.token);
    let input = ctx.input;

    let renderOptions: Record<string, unknown> | undefined;
    if (input.render) {
      renderOptions = {};
      if (input.render.blockResources !== undefined)
        renderOptions.BlockResources = input.render.blockResources;
      if (input.render.waitUntil) renderOptions.WaitUntil = input.render.waitUntil;
      if (input.render.customWait !== undefined)
        renderOptions.CustomWait = input.render.customWait;
      if (input.render.waitSelector) renderOptions.WaitSelector = input.render.waitSelector;
      if (input.render.returnJSON !== undefined)
        renderOptions.ReturnJSON = input.render.returnJSON;
      if (input.render.screenshot !== undefined)
        renderOptions.Screenshot = input.render.screenshot;
      if (input.render.fullScreenshot !== undefined)
        renderOptions.FullScreenshot = input.render.fullScreenshot;
      if (input.render.particularScreenshot)
        renderOptions.ParticularScreenshot = input.render.particularScreenshot;
    }

    let result = await client.createAsyncJob({
      targets: input.targets,
      method: input.method,
      body: input.requestBody,
      geoCode: input.geoCode,
      regionalGeoCode: input.regionalGeoCode,
      super: input.super,
      headers: input.headers,
      forwardHeaders: input.forwardHeaders,
      sessionId: input.sessionId,
      device: input.device,
      setCookies: input.setCookies,
      timeout: input.timeout,
      retryTimeout: input.retryTimeout,
      disableRetry: input.disableRetry,
      disableRedirection: input.disableRedirection,
      output: input.output,
      webhookUrl: input.webhookUrl,
      webhookHeaders: input.webhookHeaders,
      render: renderOptions as any
    });

    return {
      output: {
        jobId: result.JobID,
        taskIds: result.TaskIDs,
        message: result.Message
      },
      message: `Created async scraping job **${result.JobID}** with **${input.targets.length}** target(s).`
    };
  })
  .build();
