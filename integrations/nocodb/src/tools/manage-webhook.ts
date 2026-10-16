import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  optionalBoolean,
  optionalString,
  requireRecord,
  requireString,
  responseList
} from '../lib/schemas';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, update, delete, or list webhooks on a NocoDB table. Webhooks notify external services when record events occur (insert, update, delete).
- **list**: List all webhooks for a table.
- **create**: Create a new webhook on a table.
- **update**: Update an existing webhook.
- **delete**: Delete a webhook.`,
  instructions: [
    'Supported events: after.insert, after.update, after.delete',
    'The notification type for URL-based webhooks is "URL".'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      tableId: z.string().optional().describe('Table ID (required for list and create)'),
      hookId: z
        .string()
        .optional()
        .describe('Webhook/hook ID (required for update and delete)'),
      title: z.string().optional().describe('Webhook title (for create/update)'),
      event: z
        .enum(['after.insert', 'after.update', 'after.delete'])
        .optional()
        .describe('Event type to trigger on (for create/update)'),
      notificationUrl: z
        .string()
        .optional()
        .describe('URL to call when webhook fires (for create/update)'),
      notificationMethod: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
        .optional()
        .describe('HTTP method for the webhook call (default POST)'),
      headers: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom headers to send with webhook request'),
      active: z
        .boolean()
        .optional()
        .describe('Whether the webhook is active (for create/update)')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            hookId: z.string().describe('Webhook ID'),
            title: z.string().optional(),
            event: z.string().optional(),
            active: z.boolean().optional()
          })
        )
        .optional()
        .describe('List of webhooks (for list action)'),
      hookId: z.string().optional().describe('ID of the created/updated/deleted webhook'),
      success: z.boolean().describe('Whether the operation succeeded'),
      raw: z.any().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let {
      action,
      tableId,
      hookId,
      title,
      event,
      notificationUrl,
      notificationMethod,
      headers,
      active
    } = ctx.input;

    if (action === 'list') {
      if (!tableId) throw createApiServiceError('tableId is required for listing webhooks');
      let result = await client.listWebhooks(tableId);
      let list = responseList(result, 'webhooks');
      let webhooks = list.map((h: any) => ({
        hookId: requireString(h.id, 'webhook ID'),
        title: optionalString(h.title),
        event: optionalString(h.event),
        active: optionalBoolean(h.active)
      }));
      return {
        output: { webhooks, success: true, raw: result },
        message: `Found **${webhooks.length}** webhook(s) for table \`${tableId}\`.`
      };
    }

    if (action === 'create') {
      if (!tableId) throw createApiServiceError('tableId is required for creating a webhook');
      let eventParts = event?.split('.') ?? ['after', 'insert'];
      let data: any = {
        title: title ?? 'Webhook',
        event: eventParts[0] ?? 'after',
        operation: eventParts[1] ?? 'insert',
        active: active ?? true,
        notification: {
          type: 'URL',
          payload: {
            method: notificationMethod ?? 'POST',
            body: '{{ json data }}',
            url: notificationUrl,
            headers: headers ? JSON.stringify(headers) : undefined
          }
        }
      };
      let result = requireRecord(await client.createWebhook(tableId, data), 'created webhook');
      return {
        output: { hookId: optionalString(result.id), success: true, raw: result },
        message: `Created webhook **${title ?? 'Webhook'}** (\`${result.id}\`) on table \`${tableId}\`.`
      };
    }

    if (action === 'update') {
      if (!hookId) throw createApiServiceError('hookId is required for updating a webhook');
      let data: any = {};
      if (title) data.title = title;
      if (event) {
        let parts = event.split('.');
        data.event = parts[0];
        data.operation = parts[1];
      }
      if (active !== undefined) data.active = active;
      if (notificationUrl || notificationMethod || headers) {
        data.notification = {
          type: 'URL',
          payload: {
            ...(notificationUrl ? { url: notificationUrl } : {}),
            ...(notificationMethod ? { method: notificationMethod } : {}),
            ...(headers ? { headers: JSON.stringify(headers) } : {})
          }
        };
      }
      let result = await client.updateWebhook(hookId, data);
      return {
        output: { hookId, success: true, raw: result },
        message: `Updated webhook \`${hookId}\`.`
      };
    }

    if (action === 'delete') {
      if (!hookId) throw createApiServiceError('hookId is required for deleting a webhook');
      let result = await client.deleteWebhook(hookId);
      return {
        output: { hookId, success: true, raw: result },
        message: `Deleted webhook \`${hookId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
