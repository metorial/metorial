import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWebhookReceiver = SlateTool.create(spec, {
  name: 'Create Webhook Receiver',
  key: 'create_webhook_receiver',
  description: `Create a built-in ProxiedMail webhook receiver. Returns a unique call URL that can be used as a callback URL on a proxy email, and a polling URL to check for received payloads. Useful when you don't have a publicly accessible server to receive webhooks directly.`,
  instructions: [
    'After creating a receiver, use its callUrl as the callbackUrl on a proxy email.',
    'Then use "Poll Webhook Receiver" with the receiverId to check for incoming email payloads.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      receiverId: z.string().describe('Unique identifier of the webhook receiver'),
      callUrl: z.string().describe('URL to set as the callback URL on a proxy email'),
      getUrl: z.string().describe('URL to poll for received webhook payloads')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let receiver = await client.createWebhookReceiver();

    return {
      output: receiver,
      message: `Created webhook receiver **${receiver.receiverId}**.\n- Call URL: ${receiver.callUrl}\n- Poll URL: ${receiver.getUrl}`
    };
  })
  .build();
