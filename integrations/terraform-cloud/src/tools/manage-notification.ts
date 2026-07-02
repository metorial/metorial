import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapNotificationConfiguration } from '../lib/mappers';
import { spec } from '../spec';

let notificationSchema = z.object({
  notificationConfigurationId: z.string(),
  name: z.string(),
  destinationType: z.string(),
  url: z.string(),
  enabled: z.boolean(),
  triggers: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let listNotificationsTool = SlateTool.create(spec, {
  name: 'List Notifications',
  key: 'list_notifications',
  description: `List all notification configurations for a workspace. Shows webhook, Slack, Microsoft Teams, and email notification destinations and the events they listen for.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to list notifications for')
    })
  )
  .output(
    z.object({
      notifications: z.array(notificationSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listNotificationConfigurations(ctx.input.workspaceId);
    let notifications = (response.data || []).map(mapNotificationConfiguration);

    return {
      output: { notifications },
      message: `Found **${notifications.length}** notification configuration(s) for workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();

export let createNotificationTool = SlateTool.create(spec, {
  name: 'Create Notification',
  key: 'create_notification',
  description: `Create a notification configuration for a workspace. Send run status updates to a webhook URL, Slack channel, Microsoft Teams channel, or email addresses. Choose which events trigger notifications.`,
  instructions: [
    'Trigger names: "run:created", "run:planning", "run:needs_attention", "run:applying", "run:completed", "run:errored".',
    'Health triggers: "assessment:check_failure", "assessment:drifted", "assessment:failed".',
    'For generic webhooks, provide a URL. For Slack/Teams, provide the incoming webhook URL.',
    'For email notifications, provide emailAddresses or emailUserIds.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to create the notification for'),
      name: z.string().describe('Name for this notification configuration'),
      destinationType: z
        .enum(['generic', 'slack', 'microsoft-teams', 'email'])
        .describe('Destination type for notifications'),
      url: z
        .string()
        .optional()
        .describe('Webhook URL (required for generic, slack, and microsoft-teams)'),
      webhookSecret: z
        .string()
        .optional()
        .describe('HMAC secret for generic webhook signature verification'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the notification is enabled (default: true)'),
      triggers: z
        .array(z.string())
        .describe(
          'List of event triggers (e.g., ["run:created", "run:completed", "run:errored"])'
        ),
      emailAddresses: z
        .array(z.string())
        .optional()
        .describe('Email addresses for email notifications'),
      emailUserIds: z.array(z.string()).optional().describe('User IDs for email notifications')
    })
  )
  .output(notificationSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.createNotificationConfiguration(ctx.input.workspaceId, {
      name: ctx.input.name,
      destinationType: ctx.input.destinationType,
      url: ctx.input.url,
      token: ctx.input.webhookSecret,
      enabled: ctx.input.enabled,
      triggers: ctx.input.triggers,
      emailAddresses: ctx.input.emailAddresses,
      emailUserIds: ctx.input.emailUserIds
    });
    let notification = mapNotificationConfiguration(response.data);

    return {
      output: notification,
      message: `Created **${notification.destinationType}** notification **${notification.name}** (${notification.notificationConfigurationId}) with ${notification.triggers.length} trigger(s).`
    };
  })
  .build();

export let deleteNotificationTool = SlateTool.create(spec, {
  name: 'Delete Notification',
  key: 'delete_notification',
  description: `Delete a notification configuration from a workspace.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      notificationConfigurationId: z
        .string()
        .describe('The notification configuration ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteNotificationConfiguration(ctx.input.notificationConfigurationId);

    return {
      output: { deleted: true },
      message: `Notification configuration ${ctx.input.notificationConfigurationId} has been deleted.`
    };
  })
  .build();
