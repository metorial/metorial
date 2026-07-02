import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `View, set, or remove the default webhook URL for your Dropcontact account.
The default webhook URL is used to receive enrichment result notifications for all requests that don't specify a per-request \`custom_callback_url\`.
Only one default webhook URL is allowed per account.`,
  instructions: [
    'Use action "get" to view the current default webhook URL.',
    'Use action "set" with a callbackUrl to configure the default webhook URL.',
    'Use action "delete" to remove the current default webhook URL.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'set', 'delete'])
        .describe('Action to perform: "get" to view, "set" to configure, "delete" to remove'),
      callbackUrl: z
        .string()
        .optional()
        .describe('Webhook callback URL (required when action is "set")')
    })
  )
  .output(
    z.object({
      callbackUrl: z.string().optional().describe('Current or newly set webhook callback URL'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the webhook URL was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'get') {
      let result = await client.getDefaultWebhookUrl();
      return {
        output: {
          callbackUrl: result.callback_url
        },
        message: result.callback_url
          ? `Default webhook URL: \`${result.callback_url}\``
          : 'No default webhook URL is configured.'
      };
    }

    if (ctx.input.action === 'set') {
      if (!ctx.input.callbackUrl) {
        throw new Error('callbackUrl is required when action is "set"');
      }
      await client.setDefaultWebhookUrl(ctx.input.callbackUrl);
      return {
        output: {
          callbackUrl: ctx.input.callbackUrl
        },
        message: `Default webhook URL set to: \`${ctx.input.callbackUrl}\``
      };
    }

    // action === 'delete'
    await client.deleteDefaultWebhookUrl();
    return {
      output: {
        deleted: true
      },
      message: 'Default webhook URL has been removed.'
    };
  })
  .build();
