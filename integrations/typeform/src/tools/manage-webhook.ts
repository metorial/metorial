import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TypeformClient } from '../lib/client';
import { typeformServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, retrieve, update, or delete webhooks for a typeform. Webhooks send real-time HTTP POST notifications when a form receives a new response. Supports payload signing with HMAC SHA256 and partial response events.`,
  instructions: [
    'To **create/update**, provide **formId**, **tag**, and **url**.',
    'To **list** all webhooks for a form, provide just the **formId**.',
    'To **retrieve** a specific webhook, provide **formId** and **tag**.',
    'To **delete**, set **delete** to true and provide **formId** and **tag**.',
    'Enable **partialResponses** to receive webhooks for incomplete form submissions.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      formId: z.string().describe('Form ID to manage webhooks for'),
      tag: z.string().optional().describe('Unique webhook tag name'),
      url: z.string().optional().describe('Destination URL for webhook payloads'),
      enabled: z.boolean().optional().describe('Whether the webhook is active'),
      secret: z.string().optional().describe('Shared secret for HMAC SHA256 payload signing'),
      verifySsl: z.boolean().optional().describe('Whether to verify SSL certificates'),
      partialResponses: z
        .boolean()
        .optional()
        .describe('Subscribe to partial response events'),
      delete: z.boolean().optional().describe('Set to true to delete the webhook')
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional().describe('Webhook ID'),
      formId: z.string().describe('Form ID'),
      tag: z.string().optional().describe('Webhook tag'),
      url: z.string().optional().describe('Webhook destination URL'),
      enabled: z.boolean().optional().describe('Whether the webhook is active'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      deleted: z.boolean().optional().describe('Whether the webhook was deleted'),
      webhooks: z
        .array(
          z.object({
            webhookId: z.string().optional().describe('Webhook ID'),
            tag: z.string().describe('Webhook tag'),
            url: z.string().optional().describe('Webhook URL'),
            enabled: z.boolean().optional().describe('Whether the webhook is active'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of webhooks (when listing)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypeformClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    // Delete
    if (ctx.input.delete) {
      if (!ctx.input.tag) {
        throw typeformServiceError('tag is required when deleting a webhook.');
      }
      await client.deleteWebhook(ctx.input.formId, ctx.input.tag);
      return {
        output: {
          formId: ctx.input.formId,
          tag: ctx.input.tag,
          deleted: true
        },
        message: `Deleted webhook \`${ctx.input.tag}\` from form \`${ctx.input.formId}\`.`
      };
    }

    // Create/Update
    if (
      ctx.input.url ||
      ctx.input.enabled !== undefined ||
      ctx.input.secret ||
      ctx.input.verifySsl !== undefined ||
      ctx.input.partialResponses !== undefined
    ) {
      if (!ctx.input.tag || !ctx.input.url) {
        throw typeformServiceError(
          'formId, tag, and url are required to create or update a webhook.'
        );
      }

      let eventTypes: Record<string, boolean> | undefined;
      if (ctx.input.partialResponses !== undefined) {
        eventTypes = { form_response_partial: ctx.input.partialResponses };
      }

      let result = await client.createOrUpdateWebhook(ctx.input.formId, ctx.input.tag, {
        url: ctx.input.url,
        enabled: ctx.input.enabled,
        secret: ctx.input.secret,
        verifySsl: ctx.input.verifySsl,
        eventTypes
      });

      return {
        output: {
          webhookId: result.id,
          formId: ctx.input.formId,
          tag: result.tag,
          url: result.url,
          enabled: result.enabled,
          createdAt: result.created_at
        },
        message: `Configured webhook \`${result.tag}\` for form \`${ctx.input.formId}\` → ${result.url}.`
      };
    }

    // Retrieve single
    if (ctx.input.tag) {
      let result = await client.getWebhook(ctx.input.formId, ctx.input.tag);
      return {
        output: {
          webhookId: result.id,
          formId: ctx.input.formId,
          tag: result.tag,
          url: result.url,
          enabled: result.enabled,
          createdAt: result.created_at
        },
        message: `Retrieved webhook \`${result.tag}\` for form \`${ctx.input.formId}\`.`
      };
    }

    // List all
    let result = await client.listWebhooks(ctx.input.formId);
    let webhooks = (result.items || []).map((w: any) => ({
      webhookId: w.id,
      tag: w.tag,
      url: w.url,
      enabled: w.enabled,
      createdAt: w.created_at
    }));

    return {
      output: {
        formId: ctx.input.formId,
        webhooks
      },
      message: `Found **${webhooks.length}** webhooks for form \`${ctx.input.formId}\`.`
    };
  })
  .build();
