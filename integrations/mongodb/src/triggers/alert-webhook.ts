import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { mongodbServiceError } from '../lib/errors';
import { spec } from '../spec';

export let alertWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Alert Webhook',
  key: 'alert_webhook',
  description:
    'Receives alert notifications from MongoDB Atlas via webhook. Fires when alert conditions are met, such as host down, replication lag, disk utilization thresholds, connection thresholds, and other metric-based or conditional alerts. Configure the webhook URL in your Atlas project under Integrations > Webhook Settings.'
})
  .input(
    z.object({
      alertId: z.string().describe('Unique identifier of the alert'),
      eventTypeName: z.string().describe('Type of alert event'),
      status: z.string().describe('Alert status (OPEN, CLOSED, TRACKING, INFORMATIONAL)'),
      groupId: z.string().optional().describe('Project ID'),
      clusterName: z.string().optional().describe('Cluster name'),
      replicaSetName: z.string().optional().describe('Replica set name'),
      hostnameAndPort: z
        .string()
        .optional()
        .describe('Hostname and port of the affected host'),
      metricName: z.string().optional().describe('Metric name for metric-based alerts'),
      currentValue: z.any().optional().describe('Current metric value'),
      created: z.string().optional().describe('ISO 8601 timestamp when the alert was created'),
      updated: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the alert was last updated'),
      resolved: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the alert was resolved'),
      humanReadable: z.string().optional().describe('Human-readable description of the alert'),
      rawPayload: z.record(z.string(), z.any()).optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      alertId: z.string().describe('Unique identifier of the alert'),
      eventTypeName: z.string().describe('Type of alert event'),
      status: z.string().describe('Alert status'),
      groupId: z.string().optional().describe('Project ID'),
      clusterName: z.string().optional().describe('Cluster name associated with the alert'),
      replicaSetName: z.string().optional().describe('Replica set name'),
      hostnameAndPort: z.string().optional().describe('Affected host'),
      metricName: z.string().optional().describe('Metric name'),
      currentValue: z
        .any()
        .optional()
        .describe('Current metric value when alert was triggered'),
      created: z.string().optional().describe('ISO 8601 creation timestamp'),
      updated: z.string().optional().describe('ISO 8601 update timestamp'),
      resolved: z.string().optional().describe('ISO 8601 resolution timestamp'),
      humanReadable: z.string().optional().describe('Human-readable alert description')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let projectId = ctx.config.projectId;
      if (!projectId)
        throw mongodbServiceError(
          'projectId is required in configuration to auto-register webhooks'
        );

      let client = new AtlasClient(ctx.auth);
      let result = await client.configureWebhookIntegration(projectId, {
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          projectId,
          integrationType: 'WEBHOOK',
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let details = ctx.input.registrationDetails as {
        projectId: string;
        integrationType: string;
      };
      if (!details?.projectId) return;

      let client = new AtlasClient(ctx.auth);
      await client.deleteThirdPartyIntegration(
        details.projectId,
        details.integrationType || 'WEBHOOK'
      );
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Atlas webhook payloads can come in different formats
      // Normalize the payload
      let alertId = data.id || data.alertId || '';
      let eventTypeName = data.eventTypeName || data.typeName || '';
      let status = data.status || '';

      if (!alertId && !eventTypeName) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            alertId: String(alertId),
            eventTypeName,
            status,
            groupId: data.groupId,
            clusterName: data.clusterName,
            replicaSetName: data.replicaSetName,
            hostnameAndPort: data.hostnameAndPort,
            metricName: data.metricName,
            currentValue: data.currentValue,
            created: data.created,
            updated: data.updated,
            resolved: data.resolved,
            humanReadable: data.humanReadable,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let statusSuffix = ctx.input.status ? ctx.input.status.toLowerCase() : 'triggered';
      return {
        type: `alert.${statusSuffix}`,
        id: `${ctx.input.alertId}-${ctx.input.status}-${ctx.input.updated || ctx.input.created || ''}`,
        output: {
          alertId: ctx.input.alertId,
          eventTypeName: ctx.input.eventTypeName,
          status: ctx.input.status,
          groupId: ctx.input.groupId,
          clusterName: ctx.input.clusterName,
          replicaSetName: ctx.input.replicaSetName,
          hostnameAndPort: ctx.input.hostnameAndPort,
          metricName: ctx.input.metricName,
          currentValue: ctx.input.currentValue,
          created: ctx.input.created,
          updated: ctx.input.updated,
          resolved: ctx.input.resolved,
          humanReadable: ctx.input.humanReadable
        }
      };
    }
  })
  .build();
