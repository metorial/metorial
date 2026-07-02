import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let alertWebhook = SlateTrigger.create(spec, {
  name: 'Alert Webhook',
  key: 'alert_webhook',
  description:
    'Receives webhook notifications from LogDNA when alert conditions on views are triggered. Configure the webhook URL in your LogDNA view or preset alert settings.'
})
  .input(
    z.object({
      alertName: z.string().optional().describe('Name of the alert that was triggered'),
      viewName: z.string().optional().describe('Name of the view that triggered the alert'),
      matches: z.any().optional().describe('Log lines that matched the alert condition'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw webhook payload from LogDNA')
    })
  )
  .output(
    z.object({
      alertName: z.string().optional().describe('Name of the triggered alert'),
      viewName: z.string().optional().describe('Name of the view'),
      logLines: z
        .array(
          z.object({
            timestamp: z.string().optional().describe('Timestamp of the log line'),
            message: z.string().optional().describe('Log message content'),
            app: z.string().optional().describe('Application name'),
            level: z.string().optional().describe('Log level'),
            host: z.string().optional().describe('Source hostname')
          })
        )
        .optional()
        .describe('Matching log lines that triggered the alert'),
      matchCount: z.number().optional().describe('Number of matching log lines')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        data = {};
      }

      // LogDNA webhook payloads can vary based on the alert config bodyTemplate
      // Normalize the payload to extract known fields
      let alertName = data.alert?.name || data.name || data.alert_name || undefined;
      let viewName = data.view?.name || data.view_name || undefined;
      let matches = data.lines || data.matches || data.log_lines || undefined;

      return {
        inputs: [
          {
            alertName,
            viewName,
            matches,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let logLines: any[] = [];
      if (Array.isArray(ctx.input.matches)) {
        logLines = ctx.input.matches.map((line: any) => ({
          timestamp: line.timestamp ? String(line.timestamp) : undefined,
          message: line.line || line.message || line._line || undefined,
          app: line.app || line._app || undefined,
          level: line.level || line._level || undefined,
          host: line.host || line._host || undefined
        }));
      }

      // Generate a unique ID from the payload
      let eventId =
        ctx.input.rawPayload?.id ||
        ctx.input.rawPayload?.alert_id ||
        `alert_${ctx.input.alertName || 'unknown'}_${Date.now()}`;

      return {
        type: 'alert.triggered',
        id: String(eventId),
        output: {
          alertName: ctx.input.alertName,
          viewName: ctx.input.viewName,
          logLines: logLines.length > 0 ? logLines : undefined,
          matchCount: logLines.length || undefined
        }
      };
    }
  })
  .build();
