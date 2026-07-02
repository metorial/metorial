import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let scrapeResult = SlateTrigger.create(spec, {
  name: 'Scrape Result Received',
  key: 'scrape_result_received',
  description:
    'Triggered when Scrape.do delivers results via webhook — either from a callback URL on a standard scraping request or from an async job webhook. Configure the webhook URL in your scraping requests or async jobs to receive results here.',
  instructions: [
    'Use the provided webhook URL as the "callback" parameter in standard scraping requests, or as the "WebhookURL" in async job payloads.'
  ]
})
  .input(
    z.object({
      requestUrl: z.string().describe('The original URL that was scraped'),
      content: z.string().describe('The scraped content'),
      statusCode: z.number().optional().describe('HTTP status code from the target'),
      taskId: z.string().optional().describe('Task ID if from an async job'),
      jobId: z.string().optional().describe('Job ID if from an async job'),
      webhookId: z.string().describe('Unique identifier for this webhook delivery')
    })
  )
  .output(
    z.object({
      requestUrl: z.string().describe('The original URL that was scraped'),
      content: z.string().describe('The scraped content'),
      statusCode: z.number().optional().describe('HTTP status code from the target'),
      taskId: z.string().optional().describe('Task ID if from an async job'),
      jobId: z.string().optional().describe('Job ID if from an async job')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') || '';
      let isJson = contentType.includes('application/json');

      let body: string;
      let parsed: Record<string, unknown> = {};

      if (isJson) {
        try {
          parsed = (await ctx.request.json()) as Record<string, unknown>;
          body = JSON.stringify(parsed);
        } catch {
          body = await ctx.request.text();
        }
      } else {
        body = await ctx.request.text();
      }

      // Extract identifiers from either async job webhooks or callback responses
      let taskId = (parsed.TaskID as string) || (parsed.taskId as string) || undefined;
      let jobId = (parsed.JobID as string) || (parsed.jobId as string) || undefined;
      let url = (parsed.URL as string) || (parsed.url as string) || '';
      let statusCode =
        (parsed.StatusCode as number) || (parsed.statusCode as number) || undefined;
      let content = (parsed.Content as string) || (parsed.content as string) || body;

      let webhookId =
        taskId || `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      return {
        inputs: [
          {
            requestUrl: url,
            content,
            statusCode,
            taskId,
            jobId,
            webhookId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.jobId ? 'async_job.completed' : 'scrape.completed';

      return {
        type: eventType,
        id: ctx.input.webhookId,
        output: {
          requestUrl: ctx.input.requestUrl,
          content: ctx.input.content,
          statusCode: ctx.input.statusCode,
          taskId: ctx.input.taskId,
          jobId: ctx.input.jobId
        }
      };
    }
  })
  .build();
