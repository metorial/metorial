import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let _runSchema = z.object({
  projectToken: z.string().describe('Token of the project this run belongs to'),
  runToken: z.string().describe('Unique token identifying this run'),
  status: z
    .string()
    .describe('Current status: initialized, running, cancelled, complete, or error'),
  dataReady: z
    .number()
    .describe('Whether extracted data is available (1 = ready, 0 = not ready)'),
  startTime: z.string().describe('When the run started'),
  endTime: z.string().describe('When the run ended'),
  pages: z.number().describe('Number of pages scraped'),
  md5sum: z.string().describe('MD5 checksum of the extracted data'),
  startUrl: z.string().describe('URL the run started scraping from'),
  startTemplate: z.string().describe('Template used as the entry point'),
  startValue: z.string().describe('Value passed to the project')
});

export let runStatusChanged = SlateTrigger.create(spec, {
  name: 'Run Status Changed',
  key: 'run_status_changed',
  description: `Triggers when a scraping run's status or data readiness changes. Fires on status transitions (e.g., initialized → running → complete) and when extracted data becomes available. Webhooks must be configured per project in the ParseHub client's Settings tab.`
})
  .input(
    z.object({
      projectToken: z.string().describe('Token of the project this run belongs to'),
      runToken: z.string().describe('Unique token identifying this run'),
      status: z.string().describe('Current status of the run'),
      dataReady: z.number().describe('Whether extracted data is available'),
      startTime: z.string().optional().describe('When the run started'),
      endTime: z.string().optional().describe('When the run ended'),
      pages: z.number().optional().describe('Number of pages scraped'),
      md5sum: z.string().optional().describe('MD5 checksum of the extracted data'),
      startUrl: z.string().optional().describe('URL the run started scraping from'),
      startTemplate: z.string().optional().describe('Template used as the entry point'),
      startValue: z.string().optional().describe('Value passed to the project'),
      newRunToken: z
        .string()
        .optional()
        .describe('If the run errored and was retried, the token of the new run'),
      newRunUrl: z
        .string()
        .optional()
        .describe('If the run errored and was retried, the URL of the new run')
    })
  )
  .output(
    z.object({
      projectToken: z.string().describe('Token of the project this run belongs to'),
      runToken: z.string().describe('Unique token identifying this run'),
      status: z
        .string()
        .describe('Current status: initialized, running, cancelled, complete, or error'),
      dataReady: z
        .number()
        .describe('Whether extracted data is available (1 = ready, 0 = not ready)'),
      startTime: z.string().optional().describe('When the run started'),
      endTime: z.string().optional().describe('When the run ended'),
      pages: z.number().optional().describe('Number of pages scraped'),
      md5sum: z.string().optional().describe('MD5 checksum of the extracted data'),
      startUrl: z.string().optional().describe('URL the run started scraping from'),
      startTemplate: z.string().optional().describe('Template used as the entry point'),
      startValue: z.string().optional().describe('Value passed to the project'),
      newRunToken: z
        .string()
        .optional()
        .describe(
          'Token of the retried run (only present if status is error and a retry was triggered)'
        ),
      newRunUrl: z
        .string()
        .optional()
        .describe(
          'URL of the retried run (only present if status is error and a retry was triggered)'
        )
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // ParseHub sends the run object as the POST body
      // If the run errored and was retried, there may be a new_run field
      let newRun = body.new_run;

      return {
        inputs: [
          {
            projectToken: body.project_token,
            runToken: body.run_token,
            status: body.status,
            dataReady: body.data_ready,
            startTime: body.start_time,
            endTime: body.end_time,
            pages: body.pages,
            md5sum: body.md5sum,
            startUrl: body.start_url,
            startTemplate: body.start_template,
            startValue: body.start_value,
            newRunToken: newRun?.run_token,
            newRunUrl: newRun?.start_url
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { status, runToken } = ctx.input;

      let eventType = `run.${status}`;

      // Use run token + status as dedup ID since the same run can transition through multiple statuses
      let deduplicationId = `${runToken}:${status}:${ctx.input.dataReady}`;

      return {
        type: eventType,
        id: deduplicationId,
        output: {
          projectToken: ctx.input.projectToken,
          runToken: ctx.input.runToken,
          status: ctx.input.status,
          dataReady: ctx.input.dataReady,
          startTime: ctx.input.startTime,
          endTime: ctx.input.endTime,
          pages: ctx.input.pages,
          md5sum: ctx.input.md5sum,
          startUrl: ctx.input.startUrl,
          startTemplate: ctx.input.startTemplate,
          startValue: ctx.input.startValue,
          newRunToken: ctx.input.newRunToken,
          newRunUrl: ctx.input.newRunUrl
        }
      };
    }
  })
  .build();
