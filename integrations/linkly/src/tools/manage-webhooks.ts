import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `Manages webhook subscriptions for click notifications. Supports listing, creating, and deleting webhooks at both the link level and workspace level. Link-level webhooks fire only for that specific link; workspace-level webhooks fire for all links.`,
  instructions: [
    'Set action to "list", "create", or "delete".',
    'Set scope to "link" for link-level webhooks or "workspace" for workspace-level webhooks.',
    'When scope is "link", the linkId field is required.',
    'When deleting, provide the webhookId to remove.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      scope: z
        .enum(['link', 'workspace'])
        .describe('Webhook scope: "link" for a specific link or "workspace" for all links'),
      linkId: z.number().optional().describe('Link ID (required when scope is "link")'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook endpoint URL (required for "create" action)'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID to delete (required for "delete" action)')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string().optional().describe('Webhook identifier'),
            url: z.string().optional().describe('Webhook endpoint URL')
          })
        )
        .optional()
        .describe('List of webhooks (for "list" action)'),
      createdWebhookId: z
        .string()
        .optional()
        .describe('ID of the newly created webhook (for "create" action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether deletion was successful (for "delete" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let { action, scope, linkId, webhookUrl, webhookId } = ctx.input;

    if (action === 'list') {
      let result: any;
      if (scope === 'link') {
        if (!linkId) throw new Error('linkId is required when scope is "link"');
        result = await client.listLinkWebhooks(linkId);
      } else {
        result = await client.listWorkspaceWebhooks();
      }

      let webhooks = (Array.isArray(result) ? result : []).map((w: any) => ({
        webhookId: w.id ? String(w.id) : w.url,
        url: w.url || w.id
      }));

      return {
        output: { webhooks },
        message: `Found **${webhooks.length}** ${scope}-level webhook(s)`
      };
    }

    if (action === 'create') {
      if (!webhookUrl) throw new Error('webhookUrl is required for "create" action');

      let result: any;
      if (scope === 'link') {
        if (!linkId) throw new Error('linkId is required when scope is "link"');
        result = await client.createLinkWebhook(linkId, webhookUrl);
      } else {
        result = await client.createWorkspaceWebhook(webhookUrl);
      }

      let createdId = result.id ? String(result.id) : webhookUrl;

      return {
        output: { createdWebhookId: createdId },
        message: `Created ${scope}-level webhook: ${webhookUrl}`
      };
    }

    if (action === 'delete') {
      if (!webhookId) throw new Error('webhookId is required for "delete" action');

      if (scope === 'link') {
        if (!linkId) throw new Error('linkId is required when scope is "link"');
        await client.deleteLinkWebhook(linkId, webhookId);
      } else {
        await client.deleteWorkspaceWebhook(webhookId);
      }

      return {
        output: { deleted: true },
        message: `Deleted ${scope}-level webhook: ${webhookId}`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
