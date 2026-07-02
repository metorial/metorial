import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let extractEventsTrigger = SlateTrigger.create(spec, {
  name: 'Extract Events',
  key: 'extract_events',
  description:
    'Receives webhook events for extract jobs — started, completed, and failed. Configure the webhook URL when starting an extract job.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of extract event'),
      extractId: z.string().describe('ID of the extract job'),
      extractedData: z
        .any()
        .optional()
        .describe('Extracted structured data for completed events'),
      error: z.string().optional().describe('Error message for failed events'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata from the extract job')
    })
  )
  .output(
    z.object({
      extractId: z.string().describe('ID of the extract job'),
      extractedData: z.any().optional().describe('The extracted structured data'),
      error: z.string().optional().describe('Error message if the extraction failed'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata from the extract job')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: body.type ?? 'unknown',
            extractId: body.id ?? '',
            extractedData: body.data,
            error: body.error,
            metadata: body.metadata
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.extractId}-${ctx.input.eventType}`,
        output: {
          extractId: ctx.input.extractId,
          extractedData: ctx.input.extractedData,
          error: ctx.input.error,
          metadata: ctx.input.metadata
        }
      };
    }
  });
