import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { requireString } from '../lib/validation';
import { spec } from '../spec';

export let alertWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Alert Notification',
  key: 'alert_notification',
  description:
    'Receives alert notifications from MongoDB Atlas via webhook when alert conditions are triggered. Covers metric alerts (CPU, memory, disk, connections) and event-based alerts (host down, failover, backup failures).'
})
  .input(
    z.object({
      alertId: z.string().describe('Atlas alert ID'),
      eventTypeName: z.string().describe('Type of event that triggered the alert'),
      status: z.string().describe('Alert status (OPEN, TRACKING, CLOSED, CANCELLED)'),
      groupId: z.string().describe('Project (group) ID'),
      alertConfigId: z.string().describe('Alert configuration ID'),
      clusterName: z.string().optional().describe('Cluster name if applicable'),
      replicaSetName: z.string().optional().describe('Replica set name if applicable'),
      hostname: z.string().optional().describe('Host that triggered the alert'),
      metricName: z.string().optional().describe('Metric name for metric-based alerts'),
      currentValue: z.any().optional().describe('Current metric value'),
      created: z.string().describe('Alert creation timestamp'),
      updated: z.string().describe('Alert last update timestamp'),
      resolved: z.string().optional().describe('Alert resolution timestamp'),
      raw: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      alertId: z.string().describe('Atlas alert ID'),
      eventTypeName: z.string().describe('Event type name'),
      status: z.string().describe('Alert status'),
      projectId: z.string().describe('Project ID'),
      alertConfigId: z.string().describe('Alert configuration ID'),
      clusterName: z.string().optional().describe('Cluster name'),
      replicaSetName: z.string().optional(),
      hostname: z.string().optional(),
      metricName: z.string().optional(),
      currentValue: z.any().optional(),
      created: z.string(),
      updated: z.string(),
      resolved: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx.auth);
      let projectId = requireString(
        ctx.config.projectId,
        'projectId',
        'in config for webhook registration'
      );

      // Configure the webhook integration for the project
      await client.configureIntegration(projectId, 'WEBHOOK', {
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          projectId,
          integrationType: 'WEBHOOK'
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx.auth);
      let details = ctx.input.registrationDetails;
      if (details?.projectId && details?.integrationType) {
        await client.deleteIntegration(details.projectId, details.integrationType);
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.id) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            alertId: data.id || '',
            eventTypeName: data.eventTypeName || data.typeName || 'UNKNOWN',
            status: data.status || 'OPEN',
            groupId: data.groupId || '',
            alertConfigId: data.alertConfigId || '',
            clusterName: data.clusterName,
            replicaSetName: data.replicaSetName,
            hostname: data.hostnameAndPort || data.hostname,
            metricName: data.metricName,
            currentValue: data.currentValue,
            created: data.created || new Date().toISOString(),
            updated: data.updated || new Date().toISOString(),
            resolved: data.resolved,
            raw: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      let eventType = `alert.${input.status.toLowerCase()}`;

      return {
        type: eventType,
        id: `${input.alertId}-${input.updated}`,
        output: {
          alertId: input.alertId,
          eventTypeName: input.eventTypeName,
          status: input.status,
          projectId: input.groupId,
          alertConfigId: input.alertConfigId,
          clusterName: input.clusterName,
          replicaSetName: input.replicaSetName,
          hostname: input.hostname,
          metricName: input.metricName,
          currentValue: input.currentValue,
          created: input.created,
          updated: input.updated,
          resolved: input.resolved
        }
      };
    }
  })
  .build();
