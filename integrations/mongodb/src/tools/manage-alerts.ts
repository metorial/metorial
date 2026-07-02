import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { mongodbServiceError } from '../lib/errors';
import { spec } from '../spec';

let alertSchema = z.object({
  alertId: z.string().describe('Unique identifier of the alert'),
  eventTypeName: z.string().describe('Type of event that triggered the alert'),
  status: z
    .string()
    .describe('Alert status (OPEN, TRACKING, INFORMATIONAL, CLOSED, CANCELLED)'),
  clusterName: z.string().optional().describe('Cluster associated with the alert'),
  replicaSetName: z.string().optional().describe('Replica set associated with the alert'),
  hostnameAndPort: z.string().optional().describe('Host and port associated with the alert'),
  metricName: z.string().optional().describe('Metric name if the alert is metric-based'),
  currentValue: z.any().optional().describe('Current metric value when alert was triggered'),
  created: z.string().optional().describe('ISO 8601 timestamp when alert was created'),
  updated: z.string().optional().describe('ISO 8601 timestamp when alert was last updated'),
  resolved: z.string().optional().describe('ISO 8601 timestamp when alert was resolved'),
  acknowledgedUntil: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp until alert is acknowledged'),
  acknowledgementComment: z
    .string()
    .optional()
    .describe('Comment from the user who acknowledged the alert')
});

export let manageAlertsTool = SlateTool.create(spec, {
  name: 'Manage Alerts',
  key: 'manage_alerts',
  description: `List, get, or acknowledge alerts for a MongoDB Atlas project. Alerts notify about conditions like host downtime, replication lag, high CPU, disk utilization, and many other metrics and events.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'acknowledge']).describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId.'),
      alertId: z.string().optional().describe('Alert ID (required for get and acknowledge)'),
      status: z
        .enum(['OPEN', 'TRACKING', 'INFORMATIONAL', 'CLOSED', 'CANCELLED'])
        .optional()
        .describe('Filter alerts by status (for list)'),
      acknowledgedUntil: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp until which to acknowledge the alert'),
      acknowledgementComment: z
        .string()
        .optional()
        .describe('Comment for the acknowledgement'),
      itemsPerPage: z.number().optional().describe('Number of results per page'),
      pageNum: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      alerts: z.array(alertSchema).optional().describe('List of alerts (for list action)'),
      alert: alertSchema.optional().describe('Single alert (for get/acknowledge)'),
      totalCount: z.number().optional().describe('Total count for list')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw mongodbServiceError('projectId is required');

    let client = new AtlasClient(ctx.auth);

    if (ctx.input.action === 'list') {
      let result = await client.listAlerts(projectId, {
        status: ctx.input.status,
        itemsPerPage: ctx.input.itemsPerPage,
        pageNum: ctx.input.pageNum
      });
      let alerts = (result.results || []).map((a: any) => ({
        alertId: a.id,
        eventTypeName: a.eventTypeName,
        status: a.status,
        clusterName: a.clusterName,
        replicaSetName: a.replicaSetName,
        hostnameAndPort: a.hostnameAndPort,
        metricName: a.metricName,
        currentValue: a.currentValue,
        created: a.created,
        updated: a.updated,
        resolved: a.resolved,
        acknowledgedUntil: a.acknowledgedUntil,
        acknowledgementComment: a.acknowledgementComment
      }));
      return {
        output: { alerts, totalCount: result.totalCount ?? alerts.length },
        message: `Found **${alerts.length}** alert(s)${ctx.input.status ? ` with status ${ctx.input.status}` : ''}.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.alertId) throw mongodbServiceError('alertId is required');
      let a = await client.getAlert(projectId, ctx.input.alertId);
      return {
        output: {
          alert: {
            alertId: a.id,
            eventTypeName: a.eventTypeName,
            status: a.status,
            clusterName: a.clusterName,
            replicaSetName: a.replicaSetName,
            hostnameAndPort: a.hostnameAndPort,
            metricName: a.metricName,
            currentValue: a.currentValue,
            created: a.created,
            updated: a.updated,
            resolved: a.resolved,
            acknowledgedUntil: a.acknowledgedUntil,
            acknowledgementComment: a.acknowledgementComment
          }
        },
        message: `Alert **${a.id}**: ${a.eventTypeName} - ${a.status}.`
      };
    }

    if (ctx.input.action === 'acknowledge') {
      if (!ctx.input.alertId) throw mongodbServiceError('alertId is required');
      if (!ctx.input.acknowledgedUntil)
        throw mongodbServiceError('acknowledgedUntil is required');
      let a = await client.acknowledgeAlert(projectId, ctx.input.alertId, {
        acknowledgedUntil: ctx.input.acknowledgedUntil,
        acknowledgementComment: ctx.input.acknowledgementComment
      });
      return {
        output: {
          alert: {
            alertId: a.id,
            eventTypeName: a.eventTypeName,
            status: a.status,
            clusterName: a.clusterName,
            replicaSetName: a.replicaSetName,
            hostnameAndPort: a.hostnameAndPort,
            metricName: a.metricName,
            currentValue: a.currentValue,
            created: a.created,
            updated: a.updated,
            resolved: a.resolved,
            acknowledgedUntil: a.acknowledgedUntil,
            acknowledgementComment: a.acknowledgementComment
          }
        },
        message: `Acknowledged alert **${a.id}** until ${ctx.input.acknowledgedUntil}.`
      };
    }

    throw mongodbServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
