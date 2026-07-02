import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppcuesClient } from '../lib/client';
import { spec } from '../spec';

export let exportEvents = SlateTool.create(spec, {
  name: 'Export Events',
  key: 'export_events',
  description: `Export event data from Appcues matching specified conditions and time ranges. Supports filtering by flow, checklist, NPS, segment, event name, and custom attributes. The export is processed asynchronously — use the "Get Job Status" tool to track progress.`,
  tags: {
    readOnly: true
  },
  constraints: ['Export is processed asynchronously — returns a job ID']
})
  .input(
    z.object({
      format: z.enum(['csv', 'json']).describe('Output format for the export'),
      conditions: z
        .array(z.any())
        .describe(
          'Filter conditions for the export (e.g. event names, flow IDs, segment IDs)'
        ),
      startTime: z
        .string()
        .describe('Start time for the export range (ISO 8601 or milliseconds)'),
      endTime: z
        .string()
        .optional()
        .describe('End time for the export range (ISO 8601 or milliseconds)'),
      timeZone: z.string().optional().describe('Time zone for the export'),
      email: z.string().optional().describe('Email address to send the export to'),
      limit: z.number().optional().describe('Maximum number of records to export')
    })
  )
  .output(
    z.object({
      jobId: z.string().optional().describe('Async job ID for tracking the export'),
      jobUrl: z.string().optional().describe('URL for tracking the job status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppcuesClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      region: ctx.config.region
    });

    let result = await client.exportEvents({
      format: ctx.input.format,
      conditions: ctx.input.conditions,
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      timeZone: ctx.input.timeZone,
      email: ctx.input.email,
      limit: ctx.input.limit
    });

    return {
      output: {
        jobId: result?.job_id || undefined,
        jobUrl: result?.job_url || undefined
      },
      message: `Event export initiated in **${ctx.input.format}** format.${result?.job_id ? ` Job ID: \`${result.job_id}\`` : ''}`
    };
  })
  .build();
