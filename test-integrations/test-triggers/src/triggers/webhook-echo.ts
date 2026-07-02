import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let headersToObject = (headers: Headers) => {
  let result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

let parseBody = (body: string) => {
  if (!body.trim()) return {};

  try {
    let parsed = JSON.parse(body);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : { value: parsed };
  } catch {
    return { rawBody: body };
  }
};

export let webhookEcho = SlateTrigger.create(spec, {
  key: 'webhook_echo',
  name: 'Webhook Echo',
  description:
    'Receives a webhook request and emits the received payload with a processed message.'
})
  .input(
    z.object({
      receivedAt: z.string(),
      method: z.string(),
      url: z.string(),
      headers: z.record(z.string(), z.string()),
      payload: z.record(z.string(), z.any())
    })
  )
  .output(
    z.object({
      message: z.string(),
      receivedAt: z.string(),
      method: z.string(),
      url: z.string(),
      headers: z.record(z.string(), z.string()),
      payload: z.record(z.string(), z.any())
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = await ctx.request.text();

      return {
        inputs: [
          {
            receivedAt: new Date().toISOString(),
            method: ctx.request.method,
            url: ctx.request.url,
            headers: headersToObject(ctx.request.headers),
            payload: parseBody(body)
          }
        ]
      };
    },

    handleEvent: async ctx => ({
      type: 'test.webhook.received',
      id: `webhook-${Date.parse(ctx.input.receivedAt)}`,
      output: {
        message: 'Webhook payload processed by test trigger integration.',
        receivedAt: ctx.input.receivedAt,
        method: ctx.input.method,
        url: ctx.input.url,
        headers: ctx.input.headers,
        payload: ctx.input.payload
      }
    })
  })
  .build();
