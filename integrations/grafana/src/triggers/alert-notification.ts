import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let alertSchema = z.object({
  status: z.string().describe('Alert status: firing or resolved'),
  labels: z.record(z.string(), z.string()).optional().describe('Alert labels'),
  annotations: z.record(z.string(), z.string()).optional().describe('Alert annotations'),
  startsAt: z.string().optional().describe('ISO 8601 timestamp when the alert started firing'),
  endsAt: z.string().optional().describe('ISO 8601 timestamp when the alert resolved'),
  values: z
    .record(z.string(), z.any())
    .optional()
    .describe('Metric values that triggered the alert'),
  generatorURL: z.string().optional().describe('URL to the alert rule in Grafana'),
  fingerprint: z
    .string()
    .optional()
    .describe('Unique fingerprint for the alert based on labels'),
  silenceURL: z.string().optional().describe('URL to silence this alert'),
  dashboardURL: z.string().optional().describe('Dashboard URL if associated'),
  panelURL: z.string().optional().describe('Panel URL if associated'),
  imageURL: z.string().optional().describe('Screenshot image URL')
});

export let alertNotification = SlateTrigger.create(spec, {
  name: 'Alert Notification',
  key: 'alert_notification',
  description:
    'Receives Grafana alert notifications via webhook. Triggers when alert rules change state (firing or resolved). Configure a webhook contact point in Grafana pointing to the provided webhook URL.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier'),
      status: z.string().describe('Notification status: firing or resolved'),
      receiver: z.string().optional().describe('Contact point name'),
      groupKey: z.string().optional().describe('Alert group key'),
      orgId: z.number().optional().describe('Organization ID'),
      alert: alertSchema.describe('Individual alert details')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Alert status: firing or resolved'),
      alertName: z.string().optional().describe('Alert rule name from labels'),
      severity: z.string().optional().describe('Alert severity from labels'),
      summary: z.string().optional().describe('Summary annotation'),
      description: z.string().optional().describe('Description annotation'),
      fingerprint: z.string().optional().describe('Unique alert fingerprint'),
      receiver: z.string().optional().describe('Contact point that received the alert'),
      labels: z.record(z.string(), z.string()).optional().describe('Alert labels'),
      annotations: z.record(z.string(), z.string()).optional().describe('Alert annotations'),
      startsAt: z.string().optional().describe('When the alert started firing'),
      endsAt: z.string().optional().describe('When the alert resolved'),
      generatorURL: z.string().optional().describe('Link to the alert rule'),
      dashboardURL: z.string().optional().describe('Link to the associated dashboard'),
      panelURL: z.string().optional().describe('Link to the associated panel'),
      values: z
        .record(z.string(), z.any())
        .optional()
        .describe('Metric values that triggered the alert'),
      orgId: z.number().optional().describe('Organization ID'),
      groupKey: z.string().optional().describe('Alert group key')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let alerts: any[] = data.alerts || [];
      let inputs = alerts.map((alert: any, index: number) => ({
        eventId: `${data.groupKey || 'unknown'}-${alert.fingerprint || index}-${alert.status}-${alert.startsAt || Date.now()}`,
        status: data.status || alert.status || 'unknown',
        receiver: data.receiver,
        groupKey: data.groupKey,
        orgId: data.orgId,
        alert: {
          status: alert.status || data.status,
          labels: alert.labels,
          annotations: alert.annotations,
          startsAt: alert.startsAt,
          endsAt: alert.endsAt,
          values: alert.values,
          generatorURL: alert.generatorURL,
          fingerprint: alert.fingerprint,
          silenceURL: alert.silenceURL,
          dashboardURL: alert.dashboardURL,
          panelURL: alert.panelURL,
          imageURL: alert.imageURL
        }
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let alert = ctx.input.alert;
      let labels = alert.labels || {};
      let annotations = alert.annotations || {};

      let eventType = alert.status === 'resolved' ? 'alert.resolved' : 'alert.firing';

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          status: alert.status,
          alertName: labels.alertname,
          severity: labels.severity,
          summary: annotations.summary,
          description: annotations.description,
          fingerprint: alert.fingerprint,
          receiver: ctx.input.receiver,
          labels: alert.labels,
          annotations: alert.annotations,
          startsAt: alert.startsAt,
          endsAt: alert.endsAt,
          generatorURL: alert.generatorURL,
          dashboardURL: alert.dashboardURL,
          panelURL: alert.panelURL,
          values: alert.values,
          orgId: ctx.input.orgId,
          groupKey: ctx.input.groupKey
        }
      };
    }
  })
  .build();
