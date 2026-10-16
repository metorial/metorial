import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapWebhook, rawSchema } from '../lib/response';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all webhooks configured for a specific robot. Returns the webhook IDs, destination URLs, and event types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      robotId: z
        .string()
        .describe(
          'ID of the robot to list webhooks for. Call list_robots to discover robot IDs.'
        )
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string().describe('ID of the webhook'),
            hookUrl: z.string().describe('Destination URL for the webhook'),
            eventType: z.string().describe('Event type that triggers this webhook'),
            createdAt: z
              .number()
              .optional()
              .describe('Webhook creation timestamp in milliseconds'),
            raw: rawSchema.optional()
          })
        )
        .describe('List of configured webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let webhooks = await new Client(ctx.auth).listWebhooks(ctx.input.robotId);
    let mapped = webhooks.map(mapWebhook);
    return {
      output: { webhooks: mapped },
      message: `Retrieved **${mapped.length}** webhook(s).`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Register a new webhook on a robot that fires when a specific event occurs. Supported event types: \`taskFinished\`, \`taskFinishedSuccessfully\`, \`taskFinishedWithError\`, \`taskCapturedDataChanged\`, \`tableExportFinishedSuccessfully\`.`
})
  .input(
    z.object({
      robotId: z
        .string()
        .describe(
          'ID of the robot to add the webhook to. Call list_robots to discover robot IDs.'
        ),
      hookUrl: z.string().describe('Destination URL that will receive webhook POST requests'),
      eventType: z
        .enum([
          'taskFinished',
          'taskFinishedSuccessfully',
          'taskFinishedWithError',
          'taskCapturedDataChanged',
          'tableExportFinishedSuccessfully'
        ])
        .describe('Event type that triggers this webhook')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('ID of the created webhook'),
      hookUrl: z.string().describe('Destination URL'),
      eventType: z.string().describe('Event type'),
      createdAt: z.number().optional().describe('Webhook creation timestamp in milliseconds'),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).createWebhook(
      ctx.input.robotId,
      ctx.input.hookUrl,
      ctx.input.eventType
    );
    let output = mapWebhook(result);
    return {
      output,
      message: `Created webhook \`${output.webhookId}\` for **${output.eventType}** events.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Remove a webhook from a robot. The webhook will stop receiving event notifications immediately.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      robotId: z
        .string()
        .describe(
          'ID of the robot the webhook belongs to. Call list_robots to discover robot IDs.'
        ),
      webhookId: z.string().describe('ID of the webhook to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the webhook was deleted successfully'),
      raw: rawSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteWebhook(ctx.input.robotId, ctx.input.webhookId);

    return {
      output: { success: true, raw: result },
      message: `Webhook \`${ctx.input.webhookId}\` deleted from robot \`${ctx.input.robotId}\`.`
    };
  })
  .build();
