import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { buildFileSource, fileSourceSchema } from '../lib/validation';
import { spec } from '../spec';

export let convertFileAsync = SlateTool.create(spec, {
  name: 'Convert File (Async)',
  key: 'convert_file_async',
  description: `Start an asynchronous file conversion job. Returns a job ID that can be used to poll for results.
Use this for large files or long-running conversions to avoid timeouts. Retrieve results with the **Get Async Job Result** tool.`,
  instructions: [
    'Use lowercase format strings (e.g., "pdf", "docx", "jpg").',
    'Poll the returned jobId with the get_async_job_result tool to check completion.'
  ],
  constraints: ['Job results are available for 3 hours after completion.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceFormat: z
        .string()
        .describe('Source file format extension (e.g., "docx", "html", "png")'),
      destinationFormat: z
        .string()
        .describe('Target file format extension (e.g., "pdf", "jpg", "xlsx")'),
      file: fileSourceSchema,
      storeFile: z
        .boolean()
        .optional()
        .default(true)
        .describe('Store converted file on ConvertAPI server for download'),
      conversionParameters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Format-specific conversion parameters')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Async job ID for polling')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      masterToken: ctx.auth.masterToken,
      region: ctx.config.region
    });

    let fileSource = buildFileSource(ctx.input.file);

    let result = await client.convertAsync({
      sourceFormat: ctx.input.sourceFormat,
      destinationFormat: ctx.input.destinationFormat,
      files: [fileSource],
      storeFile: ctx.input.storeFile,
      parameters: ctx.input.conversionParameters
    });

    return {
      output: result,
      message: `Async conversion **${ctx.input.sourceFormat}** → **${ctx.input.destinationFormat}** started. Job ID: \`${result.jobId}\`. Use get_async_job_result to check the status.`
    };
  })
  .build();
