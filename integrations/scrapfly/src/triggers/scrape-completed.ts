import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let scrapeCompleted = SlateTrigger.create(spec, {
  name: 'Scrape Completed',
  key: 'scrape_completed',
  description:
    'Triggered when an asynchronous scrape request completes. Receives the full scrape result payload via webhook.'
})
  .input(
    z.object({
      resourceType: z.string().describe('Webhook resource type header value.'),
      url: z.string().optional().describe('Scraped URL.'),
      statusCode: z.number().optional().describe('HTTP status code from target.'),
      content: z.string().optional().describe('Scraped content.'),
      extractedData: z.any().optional().describe('Extracted data if extraction was used.'),
      scrapeId: z.string().optional().describe('Unique scrape request ID.'),
      rawPayload: z.any().describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      url: z.string().optional().describe('URL that was scraped.'),
      statusCode: z.number().optional().describe('HTTP status code from the target website.'),
      content: z.string().optional().describe('Scraped page content.'),
      extractedData: z
        .any()
        .optional()
        .describe('Extracted structured data if extraction was configured.'),
      scrapeId: z.string().optional().describe('Unique identifier for this scrape request.'),
      cost: z.number().optional().describe('API credits consumed.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let resourceType = ctx.request.headers.get('x-scrapfly-webhook-resource-type') ?? '';

      if (resourceType !== 'scrape') {
        return { inputs: [] };
      }

      let result = data?.result ?? {};
      let config = data?.config ?? {};
      let context = data?.context ?? {};

      return {
        inputs: [
          {
            resourceType,
            url: config.url,
            statusCode: result.status_code,
            content: result.content,
            extractedData: result.extracted_data,
            scrapeId: context.id ?? config.correlation_id ?? `scrape-${Date.now()}`,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload ?? {};
      let context = payload?.context ?? {};

      return {
        type: 'scrape.completed',
        id: ctx.input.scrapeId ?? `scrape-${Date.now()}`,
        output: {
          url: ctx.input.url,
          statusCode: ctx.input.statusCode,
          content: ctx.input.content,
          extractedData: ctx.input.extractedData,
          scrapeId: ctx.input.scrapeId,
          cost: context.cost
        }
      };
    }
  })
  .build();
