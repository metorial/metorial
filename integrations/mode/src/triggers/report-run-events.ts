import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { normalizeReportRun } from '../lib/helpers';
import { spec } from '../spec';

export let reportRunEvents = SlateTrigger.create(spec, {
  name: 'Report Run Events',
  key: 'report_run_events',
  description:
    'Triggered when a report run starts or completes. Useful for monitoring execution status and triggering alerts based on results. Configure the webhook in Mode Workspace Settings > Webhooks.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Mode event name'),
      reportRunUrl: z.string().optional().describe('API URL to the report run resource'),
      reportToken: z.string().optional().describe('Extracted report token'),
      runToken: z.string().optional().describe('Extracted run token')
    })
  )
  .output(
    z.object({
      runToken: z.string().describe('Token of the report run'),
      reportToken: z.string().describe('Token of the report'),
      state: z.string().describe('Current state of the run'),
      createdAt: z.string(),
      updatedAt: z.string(),
      completedAt: z.string()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event || '';

      if (eventName !== 'report_run_started' && eventName !== 'report_run_completed') {
        return { inputs: [] };
      }

      let reportRunUrl = body.report_run_url || '';
      let reportToken = '';
      let runToken = '';

      // Extract tokens from URL: .../api/{workspace}/reports/{report}/runs/{run}
      if (reportRunUrl) {
        let parts = reportRunUrl.split('/');
        let reportsIdx = parts.indexOf('reports');
        if (reportsIdx >= 0 && parts.length > reportsIdx + 1) {
          reportToken = parts[reportsIdx + 1];
        }
        let runsIdx = parts.indexOf('runs');
        if (runsIdx >= 0 && parts.length > runsIdx + 1) {
          runToken = parts[runsIdx + 1];
        }
      }

      return {
        inputs: [
          {
            eventName,
            reportRunUrl,
            reportToken,
            runToken
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventName, reportToken, runToken } = ctx.input;

      if (reportToken && runToken) {
        try {
          let client = new ModeClient({
            token: ctx.auth.token,
            secret: ctx.auth.secret,
            workspaceName: ctx.config.workspaceName
          });
          let raw = await client.getReportRun(reportToken, runToken);
          let run = normalizeReportRun(raw);
          let type =
            eventName === 'report_run_started' ? 'report_run.started' : 'report_run.completed';
          return {
            type,
            id: `${eventName}_${runToken}`,
            output: {
              runToken: run.runToken,
              reportToken,
              state: run.state,
              createdAt: run.createdAt,
              updatedAt: run.updatedAt,
              completedAt: run.completedAt
            }
          };
        } catch {
          // Fall through
        }
      }

      let type =
        eventName === 'report_run_started' ? 'report_run.started' : 'report_run.completed';
      return {
        type,
        id: `${eventName}_${runToken || Date.now()}`,
        output: {
          runToken: runToken || '',
          reportToken: reportToken || '',
          state: '',
          createdAt: '',
          updatedAt: '',
          completedAt: ''
        }
      };
    }
  })
  .build();
