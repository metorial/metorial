import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let submitLogs = SlateTool.create(spec, {
  name: 'Submit Logs',
  key: 'submit_logs',
  description: `Send log entries directly to Datadog. Submit one or more log messages with optional source, tags, hostname, and service metadata.`,
  instructions: [
    'Each log entry must have a message field.',
    'Use ddsource to identify the source technology (e.g., "nginx", "python").',
    'Use ddtags for comma-separated tags, e.g. "env:production,version:1.0".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      logs: z
        .array(
          z.object({
            message: z.string().describe('The log message content'),
            ddsource: z
              .string()
              .optional()
              .describe('Source of the log, e.g. "nginx", "python"'),
            ddtags: z
              .string()
              .optional()
              .describe('Comma-separated tags, e.g. "env:production,version:1.0"'),
            hostname: z.string().optional().describe('Hostname of the source'),
            service: z.string().optional().describe('Service name for the log')
          })
        )
        .describe('Log entries to submit')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Submission status'),
      count: z.number().describe('Number of logs submitted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.submitLogs(ctx.input.logs);

    return {
      output: {
        status: 'ok',
        count: ctx.input.logs.length
      },
      message: `Submitted **${ctx.input.logs.length}** log entries to Datadog`
    };
  })
  .build();
