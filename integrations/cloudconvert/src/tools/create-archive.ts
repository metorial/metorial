import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createArchive = SlateTool.create(spec, {
  name: 'Create Archive',
  key: 'create_archive',
  description: `Create a ZIP, RAR, 7Z, TAR, TAR.GZ, or TAR.BZ2 archive from multiple input files.

Useful for bundling processed files together for download or storage.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrls: z
        .array(z.string())
        .min(1)
        .describe('URLs of files to include in the archive'),
      outputFormat: z
        .enum(['zip', 'rar', '7z', 'tar', 'tar.gz', 'tar.bz2'])
        .default('zip')
        .describe('Archive format'),
      tag: z.string().optional().describe('Tag to label the job'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for archive creation to complete')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the archive job'),
      status: z.string().describe('Current status of the job'),
      resultUrl: z.string().optional().describe('Temporary download URL for the archive'),
      resultFilename: z.string().optional().describe('Filename of the archive')
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

    tasks['create-archive'] = {
      operation: 'archive',
      input: importTaskNames,
      output_format: ctx.input.outputFormat
    };

    tasks['export-file'] = {
      operation: 'export/url',
      input: ['create-archive']
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
          ? `Created **${ctx.input.outputFormat.toUpperCase()}** archive with ${ctx.input.sourceUrls.length} files. ${resultFile?.url ? `Download: ${resultFile.url}` : ''}`
          : `Archive job created (status: ${job.status}).`
    };
  })
  .build();
