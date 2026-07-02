import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let databaseEvents = SlateTrigger.create(spec, {
  name: 'Database Events',
  key: 'database_events',
  description:
    'Triggers on Render Postgres and Key Value store events including availability, backups, failovers, restarts, credential changes, and more.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      eventId: z.string().describe('Event ID'),
      timestamp: z.string().describe('Event timestamp'),
      payload: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      resourceId: z.string().optional().describe('Postgres or Key Value instance ID'),
      resourceName: z.string().optional().describe('Resource name'),
      resourceType: z
        .enum(['postgres', 'key_value'])
        .optional()
        .describe('Type of database resource'),
      status: z.string().optional().describe('Event status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RenderClient(ctx.auth.token);

      let workspaces = await client.listWorkspaces({ limit: 1 });
      let ownerId = (workspaces as any[])?.[0]?.owner?.id;
      if (!ownerId) throw new Error('No workspace found to register webhook');

      let webhook = await client.createWebhook({
        ownerId,
        url: ctx.input.webhookBaseUrl,
        name: 'Slates Database Events',
        eventTypes: [
          'postgres_available',
          'postgres_unavailable',
          'postgres_created',
          'postgres_restarted',
          'postgres_backup_started',
          'postgres_backup_completed',
          'postgres_backup_failed',
          'postgres_cluster_leader_changed',
          'postgres_credentials_created',
          'postgres_credentials_deleted',
          'postgres_disk_size_changed',
          'postgres_ha_status_changed',
          'postgres_pitr_checkpoint_started',
          'postgres_pitr_checkpoint_completed',
          'postgres_pitr_checkpoint_failed',
          'postgres_restore_succeeded',
          'postgres_restore_failed',
          'postgres_upgrade_started',
          'postgres_upgrade_succeeded',
          'postgres_upgrade_failed',
          'postgres_read_replica_stale',
          'postgres_read_replicas_changed',
          'postgres_wal_archive_failed',
          'postgres_disk_autoscaling_enabled_changed',
          'key_value_available',
          'key_value_config_restart',
          'key_value_unhealthy'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RenderClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.type,
            eventId: data.data?.id || `${data.type}-${data.timestamp}`,
            timestamp: data.timestamp,
            payload: data.data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.payload || {};
      let isKeyValue = ctx.input.eventType.startsWith('key_value');

      return {
        type: `database.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          resourceId: payload.serviceId || payload.id,
          resourceName: payload.serviceName || payload.name,
          resourceType: isKeyValue ? ('key_value' as const) : ('postgres' as const),
          status: payload.status
        }
      };
    }
  })
  .build();
