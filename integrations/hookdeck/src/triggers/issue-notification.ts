import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let issueNotification = SlateTrigger.create(spec, {
  name: 'Issue Opened',
  key: 'issue_opened',
  description:
    'Triggers when a new issue is automatically opened in your Hookdeck project (delivery failure, transformation failure, or backpressure).'
})
  .input(
    z.object({
      topic: z.string().describe('Notification topic'),
      issueId: z.string().describe('Issue ID'),
      issueType: z.string().describe('Issue type (delivery, transformation, backpressure)'),
      issueStatus: z.string().describe('Issue status'),
      reference: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Issue reference details'),
      raw: z.record(z.string(), z.unknown()).describe('Raw notification payload')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('Issue ID'),
      issueType: z.string().describe('Issue type (delivery, transformation, backpressure)'),
      issueStatus: z.string().describe('Issue status'),
      reference: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Issue reference details (connection, source, destination info)'),
      firstSeenAt: z.string().optional().describe('When the issue was first seen'),
      lastSeenAt: z.string().optional().describe('When the issue was last seen')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

      // Create a dedicated source for receiving webhook notifications
      let source = await client.createSource({
        name: `slates-issue-notifications-${Date.now()}`,
        description: 'Auto-registered source for Slates issue notifications'
      });

      // Configure webhook notifications to point to this source
      await client.updateWebhookNotifications({
        enabled: true,
        source_id: source.id,
        topics: ['issue.opened']
      });

      // Create a connection from the notification source to the webhook URL
      let destination = await client.createDestination({
        name: `slates-issue-dest-${Date.now()}`,
        description: 'Auto-registered destination for Slates issue notifications',
        config: {
          url: ctx.input.webhookBaseUrl
        }
      });

      let connection = await client.createConnection({
        name: `slates-issue-connection-${Date.now()}`,
        source_id: source.id,
        destination_id: destination.id
      });

      return {
        registrationDetails: {
          sourceId: source.id,
          destinationId: destination.id,
          connectionId: connection.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
      let details = ctx.input.registrationDetails as {
        sourceId: string;
        destinationId: string;
        connectionId: string;
      };

      // Clean up: delete connection, destination, source, and disable notifications
      try {
        await client.deleteConnection(details.connectionId);
      } catch (_e) {
        /* ignore */
      }
      try {
        await client.deleteDestination(details.destinationId);
      } catch (_e) {
        /* ignore */
      }
      try {
        await client.deleteSource(details.sourceId);
      } catch (_e) {
        /* ignore */
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let topic = (data.topic as string) || 'issue.opened';

      // Extract issue data from the notification payload
      let issueData = (data.data || data) as Record<string, unknown>;

      return {
        inputs: [
          {
            topic,
            issueId: (issueData.id || data.issue_id || '') as string,
            issueType: (issueData.type || '') as string,
            issueStatus: (issueData.status || '') as string,
            reference: issueData.reference as Record<string, unknown> | undefined,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let raw = ctx.input.raw as Record<string, unknown>;
      let issueData = (raw.data || raw) as Record<string, unknown>;

      return {
        type: 'issue.opened',
        id: ctx.input.issueId || `issue-${Date.now()}`,
        output: {
          issueId: ctx.input.issueId,
          issueType: ctx.input.issueType,
          issueStatus: ctx.input.issueStatus,
          reference: ctx.input.reference,
          firstSeenAt: (issueData.first_seen_at as string) || undefined,
          lastSeenAt: (issueData.last_seen_at as string) || undefined
        }
      };
    }
  })
  .build();
