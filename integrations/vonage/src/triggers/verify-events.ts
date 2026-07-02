import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let verifyEvents = SlateTrigger.create(spec, {
  name: 'Verify Events',
  key: 'verify_events',
  description:
    'Receive verification status updates from the Vonage Verify v2 API. Triggered when a verification succeeds, fails, expires, or is cancelled.'
})
  .input(
    z.object({
      requestId: z.string().describe('Verification request ID'),
      status: z.string().describe('Verification status'),
      triggeredAt: z.string().optional().describe('Event timestamp'),
      channel: z.string().optional().describe('Channel used for verification'),
      finalized: z.boolean().optional().describe('Whether the verification is complete'),
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete raw webhook payload')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Verification request ID'),
      status: z
        .string()
        .describe('Verification status (completed, failed, expired, cancelled)'),
      triggeredAt: z.string().optional().describe('When the event occurred'),
      channel: z.string().optional().describe('Channel that was used'),
      finalized: z
        .boolean()
        .optional()
        .describe('Whether the verification workflow is complete')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: Record<string, unknown>;
      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      let requestId = (data.request_id as string) || '';
      if (!requestId) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            requestId,
            status: (data.status as string) || 'unknown',
            triggeredAt: data.triggered_at as string | undefined,
            channel: data.channel as string | undefined,
            finalized: data.finalized_at ? true : undefined,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { input } = ctx;
      return {
        type: `verification.${input.status}`,
        id: `${input.requestId}-${input.status}-${input.triggeredAt || Date.now()}`,
        output: {
          requestId: input.requestId,
          status: input.status,
          triggeredAt: input.triggeredAt,
          channel: input.channel,
          finalized: input.finalized
        }
      };
    }
  })
  .build();
