import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let alertEventsTrigger = SlateTrigger.create(spec, {
  name: 'Alert Events',
  key: 'alert_events',
  description:
    'Triggers when an issue alert rule fires or a metric alert rule changes state. For issue alerts, fires when conditions are met. For metric alerts, fires on state transitions (e.g., normal → warning → critical → resolved). Configure the webhook in Settings > Developer Settings.'
})
  .input(
    z.object({
      alertType: z.enum(['issue_alert', 'metric_alert']).describe('Type of alert'),
      action: z.string().describe('The action/state change'),
      alertId: z.string().describe('Unique identifier for deduplication'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      alertRuleId: z.string().optional(),
      alertRuleName: z.string().optional(),
      alertType: z.string().describe('issue_alert or metric_alert'),
      status: z
        .string()
        .optional()
        .describe('Alert status (e.g. critical, warning, resolved)'),
      triggerLabel: z.string().optional(),
      issueId: z.string().optional(),
      issueTitle: z.string().optional(),
      projectSlug: z.string().optional(),
      webUrl: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Determine alert type from the resource field or structure
      let resource = body.resource || '';

      if (resource === 'metric_alert' || body.data?.metric_alert) {
        let metricAlert = body.data?.metric_alert || {};
        return {
          inputs: [
            {
              alertType: 'metric_alert' as const,
              action: body.action || metricAlert.status || 'triggered',
              alertId: `metric-alert-${metricAlert.id || ''}-${body.action || ''}-${Date.now()}`,
              payload: body
            }
          ]
        };
      }

      // Issue alert (event_alert resource or default)
      let eventData = body.data?.event || {};
      return {
        inputs: [
          {
            alertType: 'issue_alert' as const,
            action: body.action || 'triggered',
            alertId: `issue-alert-${eventData.event_id || eventData.id || ''}-${Date.now()}`,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      if (ctx.input.alertType === 'metric_alert') {
        let metricAlert = ctx.input.payload?.data?.metric_alert || {};
        return {
          type: `metric_alert.${ctx.input.action}`,
          id: ctx.input.alertId,
          output: {
            alertRuleId: String(metricAlert.id || ''),
            alertRuleName: metricAlert.title || metricAlert.alert_rule?.name,
            alertType: 'metric_alert',
            status: metricAlert.status || ctx.input.action,
            triggerLabel: metricAlert.description_title,
            projectSlug: metricAlert.projects ? metricAlert.projects[0] : undefined,
            webUrl: metricAlert.web_url
          }
        };
      }

      // Issue alert
      let event = ctx.input.payload?.data?.event || {};
      let issueUrl = ctx.input.payload?.data?.issue_url;
      return {
        type: `issue_alert.${ctx.input.action}`,
        id: ctx.input.alertId,
        output: {
          alertRuleId: ctx.input.payload?.data?.triggered_rule
            ? String(ctx.input.payload.data.triggered_rule)
            : undefined,
          alertRuleName:
            ctx.input.payload?.data?.triggered_rule_label ||
            ctx.input.payload?.data?.triggered_rule,
          alertType: 'issue_alert',
          status: 'triggered',
          issueId: event.issue_id
            ? String(event.issue_id)
            : event.group_id
              ? String(event.group_id)
              : undefined,
          issueTitle: event.title,
          projectSlug: event.project?.slug || event.project,
          webUrl: issueUrl
        }
      };
    }
  })
  .build();
