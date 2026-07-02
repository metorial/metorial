import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebhooksClient } from '../lib/webhooks-client';
import { spec } from '../spec';

export let fireWebhookTool = SlateTool.create(spec, {
  name: 'Fire Webhook',
  key: 'fire_webhook',
  description: `Trigger an IFTTT webhook event via the Maker Webhooks service. This fires the "Receive a web request" trigger, which can activate any Applet connected to it. Supports passing up to 3 simple string values, or a full JSON payload for the JSON trigger variant.`,
  instructions: [
    'Requires a Webhooks key to be configured in authentication.',
    'Event names should only contain letters, numbers, and underscores.',
    'Use simple values (value1-3) for the standard trigger, or jsonPayload for the JSON trigger variant.'
  ],
  constraints: ['The Webhooks service requires an IFTTT Pro tier or higher.']
})
  .input(
    z.object({
      eventName: z
        .string()
        .describe('The webhook event name (letters, numbers, and underscores only)'),
      value1: z.string().optional().describe('First value to pass to the webhook trigger'),
      value2: z.string().optional().describe('Second value to pass to the webhook trigger'),
      value3: z.string().optional().describe('Third value to pass to the webhook trigger'),
      jsonPayload: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Full JSON payload for the JSON webhook trigger variant. When provided, value1-3 are ignored and the JSON trigger endpoint is used instead.'
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
      throw new Error(
        'Webhooks key is required to fire webhook events. Configure it in the authentication settings.'
      );
    }

    let client = new WebhooksClient(ctx.auth.webhooksKey);
    let response: any;

    if (ctx.input.jsonPayload) {
      response = await client.triggerEventWithJson(ctx.input.eventName, ctx.input.jsonPayload);
    } else {
      let values: { value1?: string; value2?: string; value3?: string } = {};
      if (ctx.input.value1) values.value1 = ctx.input.value1;
      if (ctx.input.value2) values.value2 = ctx.input.value2;
      if (ctx.input.value3) values.value3 = ctx.input.value3;
      response = await client.triggerEvent(ctx.input.eventName, values);
    }

    return {
      output: {
        eventName: ctx.input.eventName,
        response
      },
      message: `Fired webhook event **${ctx.input.eventName}**${ctx.input.jsonPayload ? ' with JSON payload' : ''}.`
    };
  })
  .build();
