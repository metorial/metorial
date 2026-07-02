import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractMetadata = SlateTool.create(spec, {
  name: 'Extract File Metadata',
  key: 'extract_metadata',
  description: `Extract metadata from a file using ExifTool. Returns properties like page count, image/video resolution, author, creation date, and more.

Useful for inspecting file properties before processing or for cataloging files.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the file to extract metadata from'),
      inputFormat: z
        .string()
        .optional()
        .describe('Input file format (auto-detected if omitted)'),
      tag: z.string().optional().describe('Tag to label the job'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for metadata extraction to complete')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the metadata job'),
      status: z.string().describe('Current status of the job'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Extracted metadata properties')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let metadataTask: Record<string, any> = {
      operation: 'metadata',
      input: ['import-file']
    };

    if (ctx.input.inputFormat) metadataTask.input_format = ctx.input.inputFormat;

    let tasks: Record<string, any> = {
      'import-file': {
        operation: 'import/url',
        url: ctx.input.sourceUrl
      },
      'extract-metadata': metadataTask
    };

    let job = await client.createJob(tasks, ctx.input.tag);

    if (ctx.input.waitForCompletion) {
      job = await client.waitForJob(job.id);
    }

    let metadataResultTask = (job.tasks ?? []).find((t: any) => t.operation === 'metadata');
    let metadata = metadataResultTask?.result?.metadata ?? {};

    return {
      output: {
        jobId: job.id,
        status: job.status,
        metadata: job.status === 'finished' ? metadata : undefined
      },
      message:
        job.status === 'finished'
          ? `Extracted metadata with ${Object.keys(metadata).length} properties.`
          : `Metadata extraction job created (status: ${job.status}).`
    };
  })
  .build();
