import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runJob = SlateTool.create(spec, {
  name: 'Run App Job',
  key: 'run_job',
  description: `Create and submit a new job to run a Promptmate.io app with the provided input data. Each data entry represents a row to be processed. You can configure language and country for localized processing, and optionally specify a callback URL for async result delivery.`,
  instructions: [
    'Use the "Get App" tool first to discover the required data fields for the app.',
    'Each object in the data array must contain at least the required data fields. Extra fields are preserved in the results.'
  ],
  constraints: ['Rate limited to 50 requests per minute.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      appId: z.string().describe('The app to run the job for'),
      data: z
        .array(z.record(z.string(), z.string()))
        .describe(
          'Array of data rows to process. Each row must contain the required data fields for the app.'
        ),
      language: z.string().optional().describe('Language setting for localized processing'),
      country: z.string().optional().describe('Country setting for localized processing'),
      callBackUrl: z
        .string()
        .optional()
        .describe('URL to receive job results when processing completes'),
      noMailOnFinish: z
        .boolean()
        .optional()
        .describe('Set to true to suppress email notifications when the job finishes')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Unique identifier of the created job'),
      jobStatus: z.string().describe('Current status of the job (e.g. "queued", "error")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createJob({
      appId: ctx.input.appId,
      data: ctx.input.data,
      config:
        ctx.input.language || ctx.input.country
          ? {
              language: ctx.input.language,
              country: ctx.input.country
            }
          : undefined,
      callBackUrl: ctx.input.callBackUrl,
      noMailOnFinish: ctx.input.noMailOnFinish
    });

    return {
      output: result,
      message: `Job **${result.jobId}** created with status **${result.jobStatus}**. Processing ${ctx.input.data.length} row(s).`
    };
  })
  .build();
