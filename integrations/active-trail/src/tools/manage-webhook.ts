import { SlateTool } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

let webhookOutputSchema = z.object({
  webhookId: z.number().describe('Webhook ID'),
  name: z.string().nullable().optional().describe('Webhook name'),
  url: z.string().nullable().optional().describe('Target URL'),
  eventType: z.any().optional().describe('Event type'),
  isActive: z.boolean().optional().describe('Whether the webhook is active')
});

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all webhooks configured in your account.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      webhooks: z.array(webhookOutputSchema).describe('List of webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let result = await client.listWebhooks();
    let webhooks = Array.isArray(result) ? result : [];
    return {
      output: {
        webhooks: webhooks.map((w: any) => ({
          webhookId: w.id,
          name: w.name,
          url: w.url,
          eventType: w.event_type,
          isActive: w.is_active
        }))
      },
      message: `Found **${webhooks.length}** webhook(s).`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook to receive callbacks when contact changes occur. Supports both programmatic and manual contact change events.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Name identifying the webhook'),
      url: z.string().describe('Target URL to receive callbacks'),
      eventType: z.string().optional().describe('Event type to listen for'),
      isActive: z
        .boolean()
        .optional()
        .describe('Whether the webhook is active (default true)'),
      parameters: z
        .array(
          z.object({
            key: z.string().describe('Parameter key'),
            value: z.string().describe('Parameter value'),
            eventValueType: z.string().optional().describe('Value type (e.g., "custom_text")'),
            eventParameterType: z
              .string()
              .optional()
              .describe('Parameter type (e.g., "header")')
          })
        )
        .optional()
        .describe('Custom parameters to send with every callback')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let data: Record<string, any> = {
      name: ctx.input.name,
      url: ctx.input.url,
      event_type: ctx.input.eventType,
      is_active: ctx.input.isActive ?? true
    };
    if (ctx.input.parameters) {
      data.parameters = ctx.input.parameters.map(p => ({
        key: p.key,
        value: p.value,
        event_value_type: p.eventValueType,
        event_parameter_type: p.eventParameterType
      }));
    }

    let result = await client.createWebhook(data);
    return {
      output: {
        webhookId: result.id,
        name: result.name,
        url: result.url,
        eventType: result.event_type,
        isActive: result.is_active
      },
      message: `Webhook **${ctx.input.name}** created with ID **${result.id}**.`
    };
  })
  .build();

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update an existing webhook's name, URL, event type, or active status.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      webhookId: z.number().describe('ID of the webhook to update'),
      name: z.string().optional().describe('New name'),
      url: z.string().optional().describe('New target URL'),
      eventType: z.string().optional().describe('New event type'),
      isActive: z.boolean().optional().describe('New active status')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.url !== undefined) data.url = ctx.input.url;
    if (ctx.input.eventType !== undefined) data.event_type = ctx.input.eventType;
    if (ctx.input.isActive !== undefined) data.is_active = ctx.input.isActive;

    let result = await client.updateWebhook(ctx.input.webhookId, data);
    return {
      output: {
        webhookId: result.id,
        name: result.name,
        url: result.url,
        eventType: result.event_type,
        isActive: result.is_active
      },
      message: `Webhook **${ctx.input.webhookId}** updated.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a webhook by ID.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      webhookId: z.number().describe('ID of the webhook to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ActiveTrailClient(ctx.auth.token);
    await client.deleteWebhook(ctx.input.webhookId);
    return {
      output: { success: true },
      message: `Webhook **${ctx.input.webhookId}** deleted.`
    };
  })
  .build();
