import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let optimizeFile = SlateTool.create(spec, {
  name: 'Optimize File',
  key: 'optimize_file',
  description: `Optimize and compress a file without changing its format. Supports PDF, PNG, and JPG files.

Reduces file size while maintaining acceptable quality. Useful for compressing images and PDFs before distribution or storage.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the file to optimize'),
      inputFormat: z
        .string()
        .optional()
        .describe('File format (e.g., "pdf", "png", "jpg"). Auto-detected if omitted.'),
      options: z
        .record(z.string(), z.any())
        .optional()
        .describe('Optimization options (e.g., quality level, profile)'),
      tag: z.string().optional().describe('Tag to label the job'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for optimization to complete')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the optimization job'),
      status: z.string().describe('Current status of the job'),
      resultUrl: z
        .string()
        .optional()
        .describe('Temporary download URL for the optimized file'),
      resultFilename: z.string().optional().describe('Filename of the optimized file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let optimizeTask: Record<string, any> = {
      operation: 'optimize',
      input: ['import-file']
    };

    if (ctx.input.inputFormat) optimizeTask.input_format = ctx.input.inputFormat;
    if (ctx.input.options) Object.assign(optimizeTask, ctx.input.options);

    let tasks: Record<string, any> = {
      'import-file': {
        operation: 'import/url',
        url: ctx.input.sourceUrl
      },
      'optimize-file': optimizeTask,
      'export-file': {
        operation: 'export/url',
        input: ['optimize-file']
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
          ? `Optimized file successfully. ${resultFile?.url ? `Download: ${resultFile.url}` : ''}`
          : `Optimization job created (status: ${job.status}).`
    };
  })
  .build();
