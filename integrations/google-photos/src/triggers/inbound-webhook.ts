import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { googlePhotosActionScopes } from '../scopes';
import { spec } from '../spec';

/**
 * Generic inbound webhook for providers without a tailored webhook trigger yet.
 * POST JSON is parsed into `payload` (non-objects are wrapped as { _value }).
 * Refine in the workflow mapper or replace with a provider-specific trigger.
 */
export let inboundWebhook = SlateTrigger.create(spec, {
  name: 'Inbound Webhook',
  key: 'inbound_webhook',
  description:
    'Receives HTTP POST at the Slates webhook URL. Parses JSON into payload (or stores raw body if not JSON). Configure your provider to POST here when supported.'
})
  .scopes(googlePhotosActionScopes.inboundWebhook)
  .input(
    z.object({
      payload: z
        .record(z.string(), z.any())
        .describe('Parsed JSON object from the request body'),
      rawBody: z.string().optional().describe('Raw body when JSON parsing failed'),
      contentType: z.string().optional().describe('Content-Type header')
    })
  )
  .output(
    z.object({
      payload: z.record(z.string(), z.any()),
      rawBody: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') ?? '';
      let text = await ctx.request.text();
      if (!text?.trim()) {
        return {
          inputs: [{ payload: {}, contentType }]
        };
      }
      try {
        let parsed = JSON.parse(text);
        let payload =
          parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : { _value: parsed };
        return {
          inputs: [{ payload, contentType }]
        };
      } catch {
        return {
          inputs: [{ payload: {}, rawBody: text, contentType }]
        };
      }
    },

    handleEvent: async ctx => {
      return {
        type: 'webhook.inbound',
        id: `inbound-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        output: {
          payload: ctx.input.payload,
          rawBody: ctx.input.rawBody
        }
      };
    }
  })
  .build();
