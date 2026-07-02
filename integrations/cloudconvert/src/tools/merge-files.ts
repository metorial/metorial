import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mergeFiles = SlateTool.create(spec, {
  name: 'Merge Files to PDF',
  key: 'merge_files',
  description: `Merge multiple files into a single PDF document.

Accepts multiple file URLs that will be combined in order into one PDF.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrls: z.array(z.string()).min(2).describe('URLs of files to merge (in order)'),
      outputFormat: z
        .string()
        .optional()
        .default('pdf')
        .describe('Output format (defaults to "pdf")'),
      engine: z.string().optional().describe('Engine to use for merging'),
      tag: z.string().optional().describe('Tag to label the job'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for merge to complete')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the merge job'),
      status: z.string().describe('Current status of the job'),
      resultUrl: z.string().optional().describe('Temporary download URL for the merged file'),
      resultFilename: z.string().optional().describe('Filename of the merged file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let tasks: Record<string, any> = {};
    let importTaskNames: string[] = [];

    ctx.input.sourceUrls.forEach((url, index) => {
      let taskName = `import-file-${index}`;
      importTaskNames.push(taskName);
      tasks[taskName] = {
        operation: 'import/url',
        url
      };
    });

    let mergeTask: Record<string, any> = {
      operation: 'merge',
      input: importTaskNames,
      output_format: ctx.input.outputFormat
    };

    if (ctx.input.engine) mergeTask.engine = ctx.input.engine;

    tasks['merge-files'] = mergeTask;
    tasks['export-file'] = {
      operation: 'export/url',
      input: ['merge-files']
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
          ? `Merged ${ctx.input.sourceUrls.length} files into PDF. ${resultFile?.url ? `Download: ${resultFile.url}` : ''}`
          : `Merge job created (status: ${job.status}).`
    };
  })
  .build();
