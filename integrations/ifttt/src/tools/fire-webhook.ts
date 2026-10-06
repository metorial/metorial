import { SlateTool } from 'slates';
import { z } from 'zod';
import { invalid } from '../lib/contracts';
import { WebhooksClient } from '../lib/webhooks-client';
import { spec } from '../spec';

export let fireWebhookTool = SlateTool.create(spec, {
  name: 'Fire Webhook',
  key: 'fire_webhook',
  description: `Currently unavailable: webhook execution refuses before sending a request because the required Webhooks credential cannot be transmitted confidentially through this connection. The existing event, three simple string values and JSON payload inputs are retained.`,
  instructions: [
    'No webhook request is sent. Use IFTTT Webhooks Documentation instructions with a trusted HTTP client to invoke an event directly.',
    'Configuring a Webhooks key does not enable execution while this limitation remains.',
    'Use the exact event name configured in your Applet.',
    'Use simple values (value1-3) for the standard trigger, or jsonPayload for the JSON trigger variant.'
  ],
  constraints: ['The Webhooks service requires an IFTTT Pro tier or higher.']
})
  .input(
    z.object({
      eventName: z.string().describe('The exact configured webhook event name'),
      value1: z.string().optional().describe('First value to pass to the webhook trigger'),
      value2: z.string().optional().describe('Second value to pass to the webhook trigger'),
      value3: z.string().optional().describe('Third value to pass to the webhook trigger'),
      jsonPayload: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Full JSON payload for the provider JSON trigger variant, which ignores value1-3. Execution is currently unavailable and no request is sent.'
        )
    })
  )
  .output(
    z.object({
      eventName: z.string().describe('The event name that was fired'),
      response: z.any().describe('Response from the IFTTT Webhooks service')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.webhooksKey) {
      invalid(
        'Webhooks key is required to fire webhook events. Configure it in the authentication settings.'
      );
    }

    let client = new WebhooksClient(ctx.auth.webhooksKey, ctx.auth.token);
    if (ctx.input.jsonPayload !== undefined) {
      return client.triggerEventWithJson(ctx.input.eventName, ctx.input.jsonPayload);
    }
    let values: { value1?: string; value2?: string; value3?: string } = {};
    if (ctx.input.value1 !== undefined) values.value1 = ctx.input.value1;
    if (ctx.input.value2 !== undefined) values.value2 = ctx.input.value2;
    if (ctx.input.value3 !== undefined) values.value3 = ctx.input.value3;
    return client.triggerEvent(ctx.input.eventName, values);
  })
  .build();
