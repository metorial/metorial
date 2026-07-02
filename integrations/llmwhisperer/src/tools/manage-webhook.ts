import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Register, update, retrieve, or delete a webhook for receiving document extraction completion notifications. Webhooks are referenced by name in extraction requests via the \`useWebhook\` parameter.
When registering, LLMWhisperer sends a test payload to verify the URL is functioning — ensure the endpoint returns a 200 status code.`,
  instructions: [
    'Set action to "register" to create a new webhook, "update" to modify an existing one, "get" to retrieve details, or "delete" to remove it.',
    'The authToken is a Bearer token (without the "Bearer" prefix). Leave empty if the webhook endpoint has no authentication.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['register', 'update', 'get', 'delete'])
        .describe('The webhook management action to perform.'),
      webhookName: z.string().describe('Name identifier for the webhook.'),
      url: z
        .string()
        .optional()
        .describe(
          'Publicly accessible URL for the webhook endpoint. Required for "register" and "update" actions.'
        ),
      authToken: z
        .string()
        .optional()
        .describe(
          'Bearer auth token for the webhook endpoint (without "Bearer" prefix). Pass empty string if no auth needed. Required for "register" and "update" actions.'
        )
    })
  )
  .output(
    z.object({
      message: z.string().optional().describe('Status message from the API.'),
      webhookName: z.string().optional().describe('Name of the webhook.'),
      url: z.string().optional().describe('Webhook URL.'),
      authToken: z.string().optional().describe('Auth token configured for the webhook.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let { action, webhookName, url, authToken } = ctx.input;

    if (action === 'register') {
      if (!url) throw new Error('URL is required for registering a webhook.');
      let result = await client.registerWebhook({
        webhookName,
        url,
        authToken: authToken ?? ''
      });
      return {
        output: { message: result.message, webhookName, url },
        message: `Webhook **${webhookName}** registered successfully at ${url}.`
      };
    }

    if (action === 'update') {
      if (!url) throw new Error('URL is required for updating a webhook.');
      let result = await client.updateWebhook({
        webhookName,
        url,
        authToken: authToken ?? ''
      });
      return {
        output: { message: result.message, webhookName, url },
        message: `Webhook **${webhookName}** updated successfully.`
      };
    }

    if (action === 'get') {
      let details = await client.getWebhookDetails(webhookName);
      return {
        output: {
          webhookName: details.webhookName,
          url: details.url,
          authToken: details.authToken
        },
        message: `Webhook **${details.webhookName}** is configured at ${details.url}.`
      };
    }

    if (action === 'delete') {
      let result = await client.deleteWebhook(webhookName);
      return {
        output: { message: result.message, webhookName },
        message: `Webhook **${webhookName}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
