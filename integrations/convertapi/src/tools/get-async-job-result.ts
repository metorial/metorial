import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let convertedFileSchema = z.object({
  fileName: z.string().describe('Name of the converted file'),
  fileExt: z.string().describe('Extension of the converted file'),
  fileSize: z.number().describe('Size of the converted file in bytes'),
  fileId: z.string().nullable().describe('ConvertAPI file ID'),
  url: z.string().nullable().describe('Download URL')
});

export let getAsyncJobResult = SlateTool.create(spec, {
  name: 'Get Async Job Result',
  key: 'get_async_job_result',
  description: `Check the status of an asynchronous conversion job and retrieve results when complete.
Returns the current job status: **processing** (still running), **completed** (results available), or **not_found** (expired or invalid).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Async job ID returned by convert_file_async')
    })
  )
  .output(
    z.object({
      status: z.enum(['processing', 'completed', 'not_found']).describe('Current job status'),
      conversionCost: z
        .number()
        .nullable()
        .describe('Number of credits consumed (when completed)'),
      conversionTime: z
        .number()
        .nullable()
        .describe('Conversion duration in seconds (when completed)'),
      files: z
        .array(convertedFileSchema)
        .nullable()
        .describe('Converted output files (when completed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let jobResult = await client.getAsyncJobResult(ctx.input.jobId);

    if (jobResult.status === 'completed' && jobResult.result) {
      return {
        output: {
          status: 'completed',
          conversionCost: jobResult.result.conversionCost,
          conversionTime: jobResult.result.conversionTime,
          files: jobResult.result.files
        },
        message: `Job \`${ctx.input.jobId}\` **completed** in ${jobResult.result.conversionTime}s. ${jobResult.result.files.length} file(s) ready.`
      };
    }

    return {
      output: {
        status: jobResult.status,
        conversionCost: null,
        conversionTime: null,
        files: null
      },
      message:
        jobResult.status === 'processing'
          ? `Job \`${ctx.input.jobId}\` is still **processing**. Try again shortly.`
          : `Job \`${ctx.input.jobId}\` was **not found** — it may have expired or is invalid.`
    };
  })
  .build();
