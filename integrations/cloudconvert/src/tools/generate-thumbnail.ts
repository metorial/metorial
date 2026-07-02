import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateThumbnail = SlateTool.create(spec, {
  name: 'Generate Thumbnail',
  key: 'generate_thumbnail',
  description: `Generate a PNG, JPG, or WEBP thumbnail from a video, document, or image file.

Useful for creating preview images, document thumbnails, or video frames.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the source file'),
      inputFormat: z
        .string()
        .optional()
        .describe('Input file format (auto-detected if omitted)'),
      outputFormat: z
        .enum(['png', 'jpg', 'webp'])
        .default('png')
        .describe('Thumbnail output format'),
      width: z.number().optional().describe('Thumbnail width in pixels'),
      height: z.number().optional().describe('Thumbnail height in pixels'),
      fit: z.string().optional().describe('Fit mode: "max", "crop", "scale", or "contain"'),
      timestamp: z
        .string()
        .optional()
        .describe('Timestamp for video thumbnails (e.g., "00:00:05")'),
      tag: z.string().optional().describe('Tag to label the job'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for thumbnail generation to complete')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the thumbnail job'),
      status: z.string().describe('Current status of the job'),
      resultUrl: z.string().optional().describe('Temporary download URL for the thumbnail'),
      resultFilename: z.string().optional().describe('Filename of the thumbnail')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let thumbnailTask: Record<string, any> = {
      operation: 'thumbnail',
      input: ['import-file'],
      output_format: ctx.input.outputFormat
    };

    if (ctx.input.inputFormat) thumbnailTask.input_format = ctx.input.inputFormat;
    if (ctx.input.width) thumbnailTask.width = ctx.input.width;
    if (ctx.input.height) thumbnailTask.height = ctx.input.height;
    if (ctx.input.fit) thumbnailTask.fit = ctx.input.fit;
    if (ctx.input.timestamp) thumbnailTask.timestamp = ctx.input.timestamp;

    let tasks: Record<string, any> = {
      'import-file': {
        operation: 'import/url',
        url: ctx.input.sourceUrl
      },
      'generate-thumbnail': thumbnailTask,
      'export-file': {
        operation: 'export/url',
        input: ['generate-thumbnail']
      }
    };

    let job = await client.createJob(tasks, ctx.input.tag);

    if (ctx.input.waitForCompletion) {
      job = await client.waitForJob(job.id);
    }

    let exportTask = (job.tasks ?? []).find((t: any) => t.operation === 'export/url');
    let resultFile = exportTask?.result?.files?.[0];

    return {
      output: {
        jobId: job.id,
        status: job.status,
        resultUrl: resultFile?.url,
        resultFilename: resultFile?.filename
      },
      message:
        job.status === 'finished'
          ? `Thumbnail generated as **${ctx.input.outputFormat.toUpperCase()}**. ${resultFile?.url ? `Download: ${resultFile.url}` : ''}`
          : `Thumbnail job created (status: ${job.status}).`
    };
  })
  .build();
