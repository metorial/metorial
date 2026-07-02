import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let queueCompleted = SlateTrigger.create(spec, {
  name: 'Queue Request Completed',
  key: 'queue_completed',
  description:
    'Triggered when an asynchronous queue request completes on Fal.ai. Configure a webhook URL when submitting queue requests to receive completion notifications.'
})
  .input(
    z.object({
      requestId: z.string().describe('Unique request identifier'),
      gatewayRequestId: z.string().describe('Gateway request identifier'),
      status: z.string().describe('Request completion status: OK or ERROR'),
      payload: z.any().optional().describe('Model output payload (present on success)'),
      error: z.string().optional().describe('Error message (present on failure)'),
      payloadError: z
        .string()
        .optional()
        .describe('Payload serialization error message if applicable')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique request identifier'),
      gatewayRequestId: z.string().describe('Gateway request identifier'),
      status: z.string().describe('Completion status: OK or ERROR'),
      payload: z.any().optional().describe('Model output payload (present on success)'),
      errorMessage: z.string().optional().describe('Error message (present on failure)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      return {
        inputs: [
          {
            requestId: data.request_id || '',
            gatewayRequestId: data.gateway_request_id || '',
            status: data.status || 'UNKNOWN',
            payload: data.payload,
            error: data.error,
            payloadError: data.payload_error
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType =
        ctx.input.status === 'OK' ? 'queue_request.completed' : 'queue_request.failed';

      return {
        type: eventType,
        id: ctx.input.requestId,
        output: {
          requestId: ctx.input.requestId,
          gatewayRequestId: ctx.input.gatewayRequestId,
          status: ctx.input.status,
          payload: ctx.input.payload,
          errorMessage: ctx.input.error || ctx.input.payloadError
        }
      };
    }
  })
  .build();
