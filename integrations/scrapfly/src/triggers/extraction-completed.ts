import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let extractionCompleted = SlateTrigger.create(spec, {
  name: 'Extraction Completed',
  key: 'extraction_completed',
  description:
    'Triggered when an asynchronous data extraction request completes. Receives the extraction result payload via webhook.'
})
  .input(
    z.object({
      resourceType: z.string().describe('Webhook resource type header value.'),
      contentType: z.string().optional().describe('Content type of the extraction result.'),
      extractedData: z.any().optional().describe('The extracted structured data.'),
      extractionId: z
        .string()
        .optional()
        .describe('Unique identifier for this extraction request.'),
      rawPayload: z.any().describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      contentType: z.string().optional().describe('Content type of the extraction result.'),
      extractedData: z.any().optional().describe('Extracted structured data.'),
      extractionId: z
        .string()
        .optional()
        .describe('Unique identifier for this extraction request.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let resourceType = ctx.request.headers.get('x-scrapfly-webhook-resource-type') ?? '';

      if (resourceType !== 'extraction') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            resourceType,
            contentType: data?.content_type,
            extractedData: data?.data,
            extractionId: data?.id ?? `extraction-${Date.now()}`,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'extraction.completed',
        id: ctx.input.extractionId ?? `extraction-${Date.now()}`,
        output: {
          contentType: ctx.input.contentType,
          extractedData: ctx.input.extractedData,
          extractionId: ctx.input.extractionId
        }
      };
    }
  })
  .build();
