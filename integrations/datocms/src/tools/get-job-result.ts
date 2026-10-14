import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobResult = SlateTool.create(spec, {
  name: 'Get Job Result',
  key: 'get_job_result',
  description:
    'Check the result of an asynchronous content or schema operation using its returned job ID. A missing result means the job may still be running, or the ID may be invalid or unavailable.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      jobId: z
        .string()
        .describe(
          'Job ID returned by an asynchronous operation, such as manage_environment fork'
        )
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      completed: z.boolean().describe('Whether a successful job result is available'),
      result: z
        .any()
        .nullable()
        .describe(
          'Completed job result, including its HTTP status and payload; null when no result is available'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    let result: any;
    try {
      result = await client.getJobResult(ctx.input.jobId);
    } catch (error) {
      if (
        isApiErrorRecord(error) &&
        isApiErrorRecord(error.data) &&
        error.data.upstreamStatus === 404
      ) {
        return {
          output: { jobId: ctx.input.jobId, completed: false, result: null },
          message: `No result is available for job **${ctx.input.jobId}**. It may still be running, or the ID may be invalid or unavailable.`
        };
      }
      throw error;
    }
    if (!Number.isInteger(result?.status)) {
      throw createApiServiceError(
        'DatoCMS returned a job result without a valid HTTP status.'
      );
    }
    if (result.status < 200 || result.status >= 300) {
      throw createApiServiceError(
        `DatoCMS job **${ctx.input.jobId}** failed. Inspect the operation inputs and retry.`,
        {
          reason: 'datocms_job_failed',
          upstreamStatus: result.status
        }
      );
    }
    return {
      output: { jobId: ctx.input.jobId, completed: true, result },
      message: `Retrieved completed result for job **${ctx.input.jobId}**.`
    };
  })
  .build();
