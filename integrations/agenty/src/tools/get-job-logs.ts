import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobLogs = SlateTool.create(spec, {
  name: 'Get Job Logs',
  key: 'get_job_logs',
  description: `Retrieve the execution logs for a specific job. Logs contain timestamped entries detailing the job's progress, errors, and processing details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique identifier of the job.'),
      offset: z
        .number()
        .min(0)
        .refine(Number.isInteger, 'Use a whole-number offset.')
        .optional()
        .describe('Number of log entries to skip. Defaults to 0.'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .refine(Number.isInteger, 'Use a whole-number limit.')
        .optional()
        .describe('Maximum log entries to return.')
    })
  )
  .output(
    z.object({
      logs: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of log entries with timestamps and messages.'),
      returned: z.number().describe('Number of log entries returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getJobLogs(ctx.input.jobId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let logs =
      typeof result === 'string'
        ? result
            .split(/\r?\n/)
            .filter(Boolean)
            .map(line => {
              let [timestamp, level, ...message] = line.split('\t');
              return { timestamp, level, message: message.join('\t') };
            })
        : Array.isArray(result)
          ? result
          : result.result || result.data || [];

    return {
      output: {
        logs,
        returned: logs.length
      },
      message: `Retrieved **${logs.length}** log entries for job **${ctx.input.jobId}**.`
    };
  })
  .build();
