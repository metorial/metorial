import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pollWebhookReceiver = SlateTool.create(spec, {
  name: 'Poll Webhook Receiver',
  key: 'poll_webhook_receiver',
  description: `Check a built-in ProxiedMail webhook receiver for incoming payloads. Returns whether a webhook has been received and its payload if available. Use after creating a receiver with "Create Webhook Receiver" and attaching its call URL to a proxy email.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      receiverId: z.string().describe('ID of the webhook receiver to poll')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the webhook receiver'),
      isReceived: z.boolean().describe('Whether a webhook payload has been received'),
      method: z.string().nullable().describe('HTTP method of the received webhook request'),
      webhookPayload: z
        .any()
        .nullable()
        .describe('The received webhook payload data, or null if nothing received yet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.pollWebhookReceiver(ctx.input.receiverId);

    return {
      output: {
        status: result.status,
        isReceived: result.isReceived,
        method: result.method,
        webhookPayload: result.payload
      },
      message: result.isReceived
        ? `Webhook received via **${result.method}** request. Payload available.`
        : `No webhook payload received yet for receiver ${ctx.input.receiverId}.`
    };
  })
  .build();
