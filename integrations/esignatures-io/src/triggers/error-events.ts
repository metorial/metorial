import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let errorEvents = SlateTrigger.create(spec, {
  name: 'Error Events',
  key: 'error_events',
  description:
    'Triggered when a delivery error occurs, such as email or SMS delivery failures. Configure the webhook URL in your eSignatures dashboard.'
})
  .input(
    z.object({
      eventStatus: z.string().describe('The webhook event status type'),
      rawPayload: z.any().describe('Complete raw webhook payload')
    })
  )
  .output(
    z.object({
      errorCode: z
        .string()
        .optional()
        .describe('Error code (e.g., email-delivery-failed, sms-delivery-failed)'),
      errorMessage: z.string().optional().describe('Detailed error message'),
      contractId: z.string().optional().describe('ID of the affected contract'),
      contractMetadata: z
        .string()
        .optional()
        .describe('Custom metadata of the affected contract')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let status = body?.status || '';

      if (status !== 'error') {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventStatus: status,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { rawPayload } = ctx.input;
      let data = rawPayload?.data || {};

      return {
        type: `error.${(data?.error_code || 'unknown').replace(/-/g, '_')}`,
        id: `error-${data?.contract_id || 'unknown'}-${data?.error_code || 'unknown'}-${Date.now()}`,
        output: {
          errorCode: data?.error_code,
          errorMessage: data?.error_message,
          contractId: data?.contract_id,
          contractMetadata: data?.metadata
        }
      };
    }
  })
  .build();
