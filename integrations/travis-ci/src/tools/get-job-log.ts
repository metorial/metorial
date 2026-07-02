import { SlateTool } from 'slates';
import { z } from 'zod';
import { TravisCIClient } from '../lib/client';
import { spec } from '../spec';

export let getJobLog = SlateTool.create(spec, {
  name: 'Get Job Log',
  key: 'get_job_log',
  description: `Retrieve or delete the log output for a specific job. Use the text format for plain text output, or json for structured log data.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Numeric job ID.'),
      action: z
        .enum(['get', 'delete'])
        .default('get')
        .describe('Whether to retrieve or delete the log.'),
      format: z
        .enum(['text', 'json'])
        .default('text')
        .describe('Output format for the log. Only applies when action is "get".')
    })
  )
  .output(
    z.object({
      logId: z.number().optional().describe('Log ID'),
      content: z
        .string()
        .nullable()
        .optional()
        .describe('Log content (text format or JSON stringified)'),
      deleted: z.boolean().optional().describe('Whether the log was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.action === 'delete') {
      await client.deleteJobLog(ctx.input.jobId);
      return {
        output: {
          deleted: true
        },
        message: `Log for job **#${ctx.input.jobId}** has been deleted.`
      };
    }

    if (ctx.input.format === 'text') {
      let content = await client.getJobLogText(ctx.input.jobId);
      return {
        output: {
          content: content,
          deleted: false
        },
        message: `Retrieved log for job **#${ctx.input.jobId}** (${content.length} characters).`
      };
    }

    let log = await client.getJobLog(ctx.input.jobId);
    return {
      output: {
        logId: log.id,
        content: log.content,
        deleted: false
      },
      message: `Retrieved log for job **#${ctx.input.jobId}** (log ID: ${log.id}).`
    };
  })
  .build();
