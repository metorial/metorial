import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalidInput } from '../lib/errors';
import { deliverJobFiles } from '../lib/files';
import { resourceId, resultFileOutput } from '../lib/schemas';
import { spec } from '../spec';
export const downloadJobFiles = SlateTool.create(spec, {
  name: 'Download Job Files',
  key: 'download_job_files',
  description:
    'Download files from finished export/url tasks in an existing job. Reads the existing job and creates no new conversion or export. Files are limited to 32 MiB each and 20 files per call; provider files normally expire after 24 hours.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      jobId: resourceId,
      fileIndex: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Optional zero-based index across finished export/url result files, in get_job task order. Select one file when a job has more than 20 files.'
        )
    })
  )
  .output(
    z.object({ jobId: z.string(), status: z.string(), files: z.array(resultFileOutput) })
  )
  .handleInvocation(async ctx => {
    const job = await clientFor(ctx).getJob(ctx.input.jobId);
    const exported = job.tasks.filter(
      task => task.operation === 'export/url' && task.status === 'finished'
    );
    if (!exported.length || !exported.some(task => task.result?.files?.length))
      throw invalidInput(
        `Job ${job.id} has no completed export/url results. Inspect get_job; no new processing was started.`
      );
    const files = await deliverJobFiles(ctx, job, ctx.input.fileIndex);
    return {
      output: {
        jobId: job.id,
        status: job.status,
        files: files.map(file => ({ filename: file.filename, url: file.url }))
      },
      message: `Result files from existing job ${job.id} are available for download.`
    };
  })
  .build();
