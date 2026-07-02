import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      robotId: z.string().describe('ID of the robot to list webhooks for')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string().describe('ID of the webhook'),
            hookUrl: z.string().describe('Destination URL for the webhook'),
            eventType: z.string().describe('Event type that triggers this webhook')
          })
        )
        .describe('List of configured webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhooks = await client.listWebhooks(ctx.input.robotId);

    let mapped = (Array.isArray(webhooks) ? webhooks : []).map((w: any) => ({
      webhookId: w.id,
      hookUrl: w.hookUrl,
      eventType: w.eventType
    }));

    return {
      output: { webhooks: mapped },
      message: `Found **${mapped.length}** webhook(s) on robot \`${ctx.input.robotId}\`.`
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
      robotId: z.string().describe('ID of the robot to add the webhook to'),
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
      eventType: z.string().describe('Event type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createWebhook(
      ctx.input.robotId,
      ctx.input.hookUrl,
      ctx.input.eventType
    );

    return {
      output: {
        webhookId: result.id,
        hookUrl: result.hookUrl ?? ctx.input.hookUrl,
        eventType: result.eventType ?? ctx.input.eventType
      },
      message: `Webhook \`${result.id}\` created for **${ctx.input.eventType}** events on robot \`${ctx.input.robotId}\`.`
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
      robotId: z.string().describe('ID of the robot the webhook belongs to'),
      webhookId: z.string().describe('ID of the webhook to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the webhook was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteWebhook(ctx.input.robotId, ctx.input.webhookId);

    return {
      output: { success: true },
      message: `Webhook \`${ctx.input.webhookId}\` deleted from robot \`${ctx.input.robotId}\`.`
    };
  })
  .build();
