import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let webhookOutputSchema = z.object({
  webhookId: z.string().describe('Unique webhook ID'),
  event: z.string().describe('Event that triggers the webhook'),
  targetUrl: z.string().describe('URL that receives webhook payloads'),
  name: z.string().nullable().describe('Webhook name'),
  status: z.string().describe('Webhook status'),
  apiVersion: z.string().describe('Ghost API version for the webhook'),
  lastTriggeredAt: z.string().nullable().describe('Last trigger timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, update, or delete a webhook on your Ghost site. Webhooks send HTTP POST payloads to a target URL when specified events occur.`,
  instructions: [
    'For **creating**: set `action` to `"create"` and provide `event` and `targetUrl`.',
    'For **updating**: set `action` to `"update"`, provide `webhookId` plus fields to change.',
    'For **deleting**: set `action` to `"delete"` and provide `webhookId`.',
    'Supported events include: `site.changed`, `post.added`, `post.edited`, `post.deleted`, `post.published`, `post.unpublished`, `post.scheduled`, `post.unscheduled`, `post.rescheduled`, `member.added`, `member.edited`, `member.deleted`, and more.'
  ],
  constraints: ['Ghost does not provide a browse/list endpoint for webhooks.']
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      webhookId: z.string().optional().describe('Webhook ID (required for update/delete)'),
      event: z
        .string()
        .optional()
        .describe('Trigger event (e.g., "post.published", "member.added")'),
      targetUrl: z.string().optional().describe('URL to send webhook payloads to'),
      name: z.string().optional().describe('Webhook name for identification'),
      secret: z.string().optional().describe('Secret for webhook payload verification'),
      apiVersion: z.string().optional().describe('Ghost API version (default: "v5")')
    })
  )
  .output(webhookOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let { action } = ctx.input;

    if (action === 'delete') {
      if (!ctx.input.webhookId)
        throw new Error('webhookId is required for deleting a webhook');
      await client.deleteWebhook(ctx.input.webhookId);
      return {
        output: {
          webhookId: ctx.input.webhookId,
          event: '',
          targetUrl: '',
          name: null,
          status: 'deleted',
          apiVersion: '',
          lastTriggeredAt: null,
          createdAt: '',
          updatedAt: ''
        },
        message: `Deleted webhook \`${ctx.input.webhookId}\`.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.event) throw new Error('event is required for creating a webhook');
      if (!ctx.input.targetUrl)
        throw new Error('targetUrl is required for creating a webhook');

      let result = await client.createWebhook({
        event: ctx.input.event,
        targetUrl: ctx.input.targetUrl,
        name: ctx.input.name,
        secret: ctx.input.secret,
        apiVersion: ctx.input.apiVersion
      });

      let w = result.webhooks[0];
      return {
        output: mapWebhook(w),
        message: `Created webhook for event **${w.event}** → \`${w.target_url}\`.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.webhookId)
        throw new Error('webhookId is required for updating a webhook');

      let data: Record<string, any> = {};
      if (ctx.input.event !== undefined) data.event = ctx.input.event;
      if (ctx.input.targetUrl !== undefined) data.target_url = ctx.input.targetUrl;
      if (ctx.input.name !== undefined) data.name = ctx.input.name;
      if (ctx.input.secret !== undefined) data.secret = ctx.input.secret;

      let result = await client.updateWebhook(ctx.input.webhookId, data);
      let w = result.webhooks[0];
      return { output: mapWebhook(w), message: `Updated webhook for event **${w.event}**.` };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapWebhook = (w: any) => ({
  webhookId: w.id,
  event: w.event,
  targetUrl: w.target_url,
  name: w.name ?? null,
  status: w.status ?? 'available',
  apiVersion: w.api_version ?? 'v5',
  lastTriggeredAt: w.last_triggered_at ?? null,
  createdAt: w.created_at,
  updatedAt: w.updated_at
});
