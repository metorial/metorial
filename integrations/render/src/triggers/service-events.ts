import { createApiServiceError, SlateTrigger } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let serviceEvents = SlateTrigger.create(spec, {
  name: 'Service Events',
  key: 'service_events',
  description:
    'Triggers on service availability, scaling, configuration, and cron job events. Covers server status changes, suspensions, maintenance, autoscaling, plan changes, and cron job runs.'
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
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      status: z.string().optional().describe('Event status or new state'),
      numInstances: z.number().optional().describe('Instance count (for scaling events)'),
      plan: z.string().optional().describe('Plan name (for plan_changed events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RenderClient(ctx.auth.token);

      let workspaces = await client.listWorkspaces({ limit: 1 });
      let ownerId = (workspaces as any[])?.[0]?.owner?.id;
      if (!ownerId) throw createApiServiceError('No workspace found to register webhook');

      let webhook = await client.createWebhook({
        ownerId,
        url: ctx.input.webhookBaseUrl,
        name: 'Slates Service Events',
        enabled: true,
        eventFilter: [
          'server_available',
          'server_failed',
          'server_hardware_failure',
          'server_restarted',
          'service_suspended',
          'service_resumed',
          'maintenance_started',
          'maintenance_ended',
          'maintenance_mode_enabled',
          'maintenance_mode_uri_updated',
          'zero_downtime_redeploy_started',
          'zero_downtime_redeploy_ended',
          'instance_count_changed',
          'autoscaling_started',
          'autoscaling_ended',
          'autoscaling_config_changed',
          'plan_changed',
          'cron_job_run_started',
          'cron_job_run_ended'
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

      return {
        type: `service.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          serviceId: payload.serviceId,
          serviceName: payload.serviceName,
          status: payload.status,
          numInstances: payload.numInstances,
          plan: payload.plan
        }
      };
    }
  })
  .build();
