import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageNotificationIntegration = SlateTool.create(spec, {
  name: 'Manage Notification Integration',
  key: 'manage_notification_integration',
  description: `Create, list, get, update, or delete webhook notification integrations. Notification integrations send events (builds, job runs, backups, billing, autoscaling, infrastructure alerts) to an HTTP endpoint.`,
  instructions: [
    'Use action "list" to see all notification integrations.',
    'Use action "create" to set up a new webhook integration. Set type to "RAW_WEBHOOK" for generic HTTP webhooks.',
    'Use action "get" to retrieve integration details by notificationId.',
    'Use action "update" to modify an existing integration.',
    'Use action "delete" to remove an integration.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'get', 'update', 'delete'])
        .describe('Operation to perform'),
      notificationId: z
        .string()
        .optional()
        .describe('Notification integration ID (required for get, update, delete)'),
      name: z.string().optional().describe('Integration name (required for create)'),
      integrationType: z
        .enum(['RAW_WEBHOOK', 'SLACK', 'DISCORD', 'TEAMS', 'TEAMS_WORKFLOWS'])
        .optional()
        .describe('Integration type (required for create)'),
      webhookUrl: z.string().optional().describe('Target webhook URL (required for create)'),
      secret: z
        .string()
        .optional()
        .describe('Secret for webhook verification (RAW_WEBHOOK only)'),
      projectIds: z
        .array(z.string())
        .optional()
        .describe('Restrict notifications to specific project IDs'),
      events: z
        .record(z.string(), z.boolean())
        .optional()
        .describe('Event types to enable, e.g. { "build:start": true, "job:success": true }'),
      page: z.number().optional().describe('Page number for list pagination'),
      perPage: z.number().optional().describe('Results per page for list (max 100)')
    })
  )
  .output(
    z.object({
      notificationId: z.string().optional().describe('Integration ID'),
      name: z.string().optional().describe('Integration name'),
      integrationType: z.string().optional().describe('Integration type'),
      webhookUrl: z.string().optional().describe('Webhook URL'),
      integrations: z
        .array(
          z.object({
            notificationId: z.string().describe('Integration ID'),
            name: z.string().describe('Integration name'),
            integrationType: z.string().describe('Integration type'),
            webhookUrl: z.string().describe('Webhook URL'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of notification integrations'),
      deleted: z.boolean().optional().describe('Whether the integration was deleted'),
      hasNextPage: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let { action, notificationId } = ctx.input;

    if (action === 'list') {
      let result = await client.listNotificationIntegrations({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let integrations = (result.data?.integrations || []).map((i: any) => ({
        notificationId: i.id,
        name: i.name,
        integrationType: i.type,
        webhookUrl: i.webhook,
        createdAt: i.createdAt
      }));
      return {
        output: {
          integrations,
          hasNextPage: result.pagination.hasNextPage
        },
        message: `Found **${integrations.length}** notification integration(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for creating an integration');
      if (!ctx.input.integrationType)
        throw new Error('integrationType is required for creating an integration');
      if (!ctx.input.webhookUrl)
        throw new Error('webhookUrl is required for creating an integration');

      let createData: any = {
        name: ctx.input.name,
        type: ctx.input.integrationType,
        webhook: ctx.input.webhookUrl
      };
      if (ctx.input.secret) createData.secret = ctx.input.secret;
      if (ctx.input.projectIds) {
        createData.restricted = true;
        createData.restrictions = { projects: ctx.input.projectIds };
      }
      if (ctx.input.events) createData.events = ctx.input.events;

      let result = await client.createNotificationIntegration(createData);
      return {
        output: {
          notificationId: result?.id,
          name: result?.name || ctx.input.name,
          integrationType: result?.type || ctx.input.integrationType,
          webhookUrl: result?.webhook || ctx.input.webhookUrl
        },
        message: `Notification integration **${ctx.input.name}** created.`
      };
    }

    if (action === 'get') {
      if (!notificationId) throw new Error('notificationId is required');
      let result = await client.getNotificationIntegration(notificationId);
      return {
        output: {
          notificationId: result?.id,
          name: result?.name,
          integrationType: result?.type,
          webhookUrl: result?.webhook
        },
        message: `Retrieved notification integration **${result?.name}**.`
      };
    }

    if (action === 'update') {
      if (!notificationId) throw new Error('notificationId is required for update');
      let updateData: any = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.webhookUrl) updateData.webhook = ctx.input.webhookUrl;
      if (ctx.input.secret) updateData.secret = ctx.input.secret;
      if (ctx.input.events) updateData.events = ctx.input.events;
      if (ctx.input.projectIds) {
        updateData.restricted = true;
        updateData.restrictions = { projects: ctx.input.projectIds };
      }
      let result = await client.updateNotificationIntegration(notificationId, updateData);
      return {
        output: {
          notificationId: result?.id || notificationId,
          name: result?.name,
          integrationType: result?.type,
          webhookUrl: result?.webhook
        },
        message: `Notification integration **${notificationId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!notificationId) throw new Error('notificationId is required for delete');
      await client.deleteNotificationIntegration(notificationId);
      return {
        output: {
          notificationId,
          deleted: true
        },
        message: `Notification integration **${notificationId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
