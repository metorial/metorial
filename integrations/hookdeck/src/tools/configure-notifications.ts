import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { hookdeckServiceError } from '../lib/errors';
import { spec } from '../spec';

let notificationConfigSchema = z.object({
  enabled: z.boolean().describe('Whether webhook notifications are enabled'),
  sourceId: z
    .string()
    .nullable()
    .optional()
    .describe('Source ID receiving webhook notifications'),
  topics: z.array(z.string()).describe('Subscribed notification topics')
});

export let configureNotifications = SlateTool.create(spec, {
  name: 'Configure Notifications',
  key: 'configure_notifications',
  description: `Get or update Hookdeck project webhook notification settings. Configure which event topics trigger webhook notifications and which source receives them.`,
  instructions: [
    'Use action "get" to view current webhook notification settings.',
    'Use action "update" to enable/disable notifications, set the source, and choose topics.',
    'Available topics: "issue.opened", "event.successful".',
    'It is recommended to create a source named "hookdeck" to receive these notifications.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'update']).describe('Action to perform'),
      enabled: z
        .boolean()
        .optional()
        .describe('Enable or disable webhook notifications (for update)'),
      sourceId: z
        .string()
        .optional()
        .describe('Source ID to receive webhook notifications (for update)'),
      topics: z
        .array(z.enum(['issue.opened', 'event.successful']))
        .optional()
        .describe('Notification topics to subscribe to (for update)')
    })
  )
  .output(notificationConfigSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    switch (ctx.input.action) {
      case 'get': {
        let config = await client.getWebhookNotifications();
        return {
          output: {
            enabled: config.enabled,
            sourceId: config.source_id ?? null,
            topics: config.topics
          },
          message: `Webhook notifications are **${config.enabled ? 'enabled' : 'disabled'}**. Topics: ${config.topics.length > 0 ? config.topics.join(', ') : 'none'}.`
        };
      }
      case 'update': {
        if (ctx.input.enabled === undefined) {
          throw hookdeckServiceError('enabled is required for "update".');
        }

        let config = await client.updateWebhookNotifications({
          enabled: ctx.input.enabled,
          source_id: ctx.input.sourceId,
          topics: ctx.input.topics
        });
        return {
          output: {
            enabled: config.enabled,
            sourceId: config.source_id ?? null,
            topics: config.topics
          },
          message: `Updated webhook notifications — **${config.enabled ? 'enabled' : 'disabled'}**. Topics: ${config.topics.length > 0 ? config.topics.join(', ') : 'none'}.`
        };
      }
    }
  })
  .build();
