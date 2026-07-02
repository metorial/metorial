import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { normalizeReport } from '../lib/helpers';
import { spec } from '../spec';

export let reportEvents = SlateTrigger.create(spec, {
  name: 'Report Events',
  key: 'report_events',
  description:
    'Triggered when a report is created or deleted in the workspace. Configure the webhook in Mode Workspace Settings > Webhooks.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Mode event name'),
      reportToken: z.string().optional().describe('Token of the report'),
      reportName: z
        .string()
        .optional()
        .describe('Name of the report (provided for delete events)'),
      reportUrl: z.string().optional().describe('API URL to the report resource')
    })
  )
  .output(
    z.object({
      reportToken: z.string().describe('Token of the report'),
      name: z.string().describe('Name of the report'),
      description: z.string().describe('Description of the report'),
      createdAt: z.string(),
      updatedAt: z.string(),
      archived: z.boolean(),
      spaceToken: z.string()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event || '';

      if (eventName !== 'report_created' && eventName !== 'report_deleted') {
        return { inputs: [] };
      }

      // For report_created, we have a report_url to fetch details
      // For report_deleted, we have report_name and report_token
      let reportToken = body.report_token || '';
      let reportUrl = body.report_url || '';

      // Try to extract token from URL if not directly provided
      if (!reportToken && reportUrl) {
        let parts = reportUrl.split('/');
        let reportsIdx = parts.indexOf('reports');
        if (reportsIdx >= 0 && parts.length > reportsIdx + 1) {
          reportToken = parts[reportsIdx + 1];
        }
      }

      return {
        inputs: [
          {
            eventName,
            reportToken,
            reportName: body.report_name || '',
            reportUrl
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventName, reportToken, reportName } = ctx.input;

      // For created events, fetch full report details
      if (eventName === 'report_created' && reportToken) {
        try {
          let client = new ModeClient({
            token: ctx.auth.token,
            secret: ctx.auth.secret,
            workspaceName: ctx.config.workspaceName
          });
          let raw = await client.getReport(reportToken);
          let report = normalizeReport(raw);
          return {
            type: 'report.created',
            id: `report_created_${reportToken}`,
            output: {
              reportToken: report.reportToken,
              name: report.name,
              description: report.description,
              createdAt: report.createdAt,
              updatedAt: report.updatedAt,
              archived: report.archived,
              spaceToken: report.spaceToken
            }
          };
        } catch {
          // Fall through to basic output
        }
      }

      // For deleted events or when fetch fails
      let eventType = eventName === 'report_created' ? 'report.created' : 'report.deleted';
      return {
        type: eventType,
        id: `${eventName}_${reportToken || Date.now()}`,
        output: {
          reportToken: reportToken || '',
          name: reportName || '',
          description: '',
          createdAt: '',
          updatedAt: '',
          archived: false,
          spaceToken: ''
        }
      };
    }
  })
  .build();
