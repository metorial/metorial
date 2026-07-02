import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let logAlert = SlateTrigger.create(spec, {
  name: 'Log Alert',
  key: 'log_alert',
  description:
    'Triggers when a Mezmo view-based alert fires. Receives webhook notifications for presence, absence, and change alerts configured on views. Configure the webhook URL in your Mezmo view alert settings.'
})
  .input(
    z.object({
      alertName: z.string().optional().describe('Name of the triggered alert'),
      alertType: z.string().optional().describe('Type of alert (presence, absence, change)'),
      viewName: z.string().optional().describe('Name of the view that triggered the alert'),
      query: z.string().optional().describe('Search query of the view'),
      matches: z.string().optional().describe('Number of matching log lines'),
      viewUrl: z.string().optional().describe('URL to the view in Mezmo dashboard'),
      lines: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Sample matching log lines'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      alertName: z.string().describe('Name of the triggered alert'),
      alertType: z.string().describe('Type of alert'),
      viewName: z.string().describe('View that triggered the alert'),
      query: z.string().describe('Search query'),
      matches: z.string().describe('Number of matching lines'),
      viewUrl: z.string().describe('Dashboard URL for the view'),
      lines: z.array(z.record(z.string(), z.unknown())).describe('Sample matching log lines')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: Record<string, unknown>;
      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        data = {};
      }

      let alertName = String(data.name || data.alert_name || data.alertName || 'Unknown');
      let alertType = String(data.type || data.alert_type || data.alertType || 'unknown');
      let viewName = String(data.view || data.view_name || data.viewName || '');
      let query = String(data.query || '');
      let matches = String(data.matches || data.count || '0');
      let viewUrl = String(data.url || data.view_url || data.viewUrl || '');
      let lines = Array.isArray(data.lines) ? data.lines : [];

      return {
        inputs: [
          {
            alertName,
            alertType,
            viewName,
            query,
            matches,
            viewUrl,
            lines: lines as Record<string, unknown>[],
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventId = `${ctx.input.alertName}-${ctx.input.viewName}-${Date.now()}`;

      return {
        type: 'log_alert.fired',
        id: eventId,
        output: {
          alertName: ctx.input.alertName || 'Unknown',
          alertType: ctx.input.alertType || 'unknown',
          viewName: ctx.input.viewName || '',
          query: ctx.input.query || '',
          matches: ctx.input.matches || '0',
          viewUrl: ctx.input.viewUrl || '',
          lines: ctx.input.lines || []
        }
      };
    }
  })
  .build();
