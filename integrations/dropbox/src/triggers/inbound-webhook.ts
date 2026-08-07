import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

/** Receives Dropbox webhook verification and notification requests. */
export let inboundWebhook = SlateTrigger.create(spec, {
  name: 'Account Changes (Webhook)',
  key: 'inbound_webhook',
  description:
    'Receives Dropbox account-change notifications. Completes endpoint verification and parses JSON deliveries into a payload, preserving non-JSON bodies as text.'
})
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
    http: {
      methods: ['GET', 'POST'],
      sync: {
        mode: 'match',
        match: [{ method: 'GET', hasQueryParam: 'challenge' }]
      }
    },
    handleRequest: async ctx => {
      if (ctx.request.method === 'GET') {
        let challenge = new URL(ctx.request.url).searchParams.get('challenge');
        if (challenge === null) {
          return {
            inputs: [],
            response: {
              status: 400,
              headers: { 'content-type': 'text/plain' },
              body: 'missing challenge parameter'
            }
          };
        }

        return {
          inputs: [],
          response: new Response(challenge, {
            status: 200,
            headers: {
              'Content-Type': 'text/plain',
              'X-Content-Type-Options': 'nosniff'
            }
          })
        };
      }

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
