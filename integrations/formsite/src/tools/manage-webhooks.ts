import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormsiteClient } from '../lib/client';
import { spec } from '../spec';

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, update, or delete webhooks for a specific form. Webhooks notify an external URL each time a form result is completed. If a webhook URL already exists, creating a webhook with the same URL will update it instead. An optional handshake key can be used for verification.`,
  instructions: [
    'Use action "list" to see all webhooks for a form.',
    'Use action "create" to register a new webhook or update an existing one by URL.',
    'Use action "delete" to remove a webhook by its URL.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      formDir: z.string().describe('Form directory identifier'),
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform on webhooks'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL (required for create and delete)'),
      handshakeKey: z
        .string()
        .optional()
        .describe(
          'Optional shared secret included in webhook payloads for verification (used with create)'
        )
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            url: z.string().describe('Webhook URL'),
            event: z.string().describe('Event type (e.g., result_completed)'),
            handshakeKey: z.string().optional().describe('Handshake key if configured')
          })
        )
        .optional()
        .describe('List of webhooks (returned for list and create actions)'),
      deleted: z.boolean().optional().describe('Whether the webhook was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormsiteClient({
      token: ctx.auth.token,
      server: ctx.config.server,
      userDir: ctx.config.userDir
    });

    let { action, formDir, webhookUrl, handshakeKey } = ctx.input;

    if (action === 'list') {
      let webhooks = await client.listWebhooks(formDir);
      return {
        output: { webhooks },
        message: `Found **${webhooks.length}** webhook(s) for form \`${formDir}\`.`
      };
    }

    if (action === 'create') {
      if (!webhookUrl) {
        throw new Error('webhookUrl is required for the create action.');
      }
      let webhook = await client.createOrUpdateWebhook(formDir, {
        url: webhookUrl,
        handshakeKey
      });
      return {
        output: { webhooks: [webhook] },
        message: `Webhook created/updated for form \`${formDir}\` → \`${webhookUrl}\`.`
      };
    }

    if (action === 'delete') {
      if (!webhookUrl) {
        throw new Error('webhookUrl is required for the delete action.');
      }
      await client.deleteWebhook(formDir, webhookUrl);
      return {
        output: { deleted: true },
        message: `Webhook deleted for form \`${formDir}\` → \`${webhookUrl}\`.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
