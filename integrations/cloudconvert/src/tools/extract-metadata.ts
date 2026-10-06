import { SlateTool } from 'slates';
import { z } from 'zod';
import { invalidResponse } from '../lib/errors';
import { createAndRead, jobMessage } from '../lib/jobs';
import { sourceUrl, tagInput, waitInput } from '../lib/schemas';
import type { Tasks } from '../lib/validation';
import { spec } from '../spec';
export const extractMetadata = SlateTool.create(spec, {
  name: 'Extract File Metadata',
  key: 'extract_metadata',
  description:
    'Create a metadata extraction job for a file at a public URL. Returns the actual ExifTool metadata when complete; this operation creates jobs but does not consume conversion credits.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      sourceUrl,
      inputFormat: z.string().min(1).optional(),
      tag: tagInput,
      waitForCompletion: waitInput
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      status: z.string(),
      metadata: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const tasks: Tasks = {
      'import-file': { operation: 'import/url', url: ctx.input.sourceUrl },
      'extract-metadata': {
        operation: 'metadata',
        input: ['import-file'],
        ...(ctx.input.inputFormat ? { input_format: ctx.input.inputFormat } : {})
      }
    };
    const job = await createAndRead(ctx, tasks, ctx.input);
    const metadata = job.tasks.find(task => task.operation === 'metadata')?.result?.metadata;
    if (job.status === 'finished' && metadata === undefined)
      throw invalidResponse(
        `Metadata job ${job.id} finished without metadata. Inspect this existing job before creating another one.`
      );
    return {
      output: {
        jobId: job.id,
        status: job.status,
        metadata: job.status === 'finished' ? metadata : undefined
      },
      message: jobMessage(job, 'Metadata extraction')
    };
  })
  .build();
