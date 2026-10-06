import { SlateTool } from 'slates';
import { z } from 'zod';
import { invalidInput } from '../lib/errors';
import { createAndRead, jobMessage, singleResult } from '../lib/jobs';
import { singleFileOutput, sourceUrl, tagInput, waitInput } from '../lib/schemas';
import type { Tasks } from '../lib/validation';
import { spec } from '../spec';

export const mergeFiles = SlateTool.create(spec, {
  name: 'Merge Files to PDF',
  key: 'merge_files',
  description:
    'Merge files from public URLs, in order, into one downloadable PDF. Non-PDF inputs are converted to PDF by CloudConvert.',
  constraints: [
    'Production processing can consume conversion credits. Sandbox only accepts whitelisted files.',
    'Download result files before the job is deleted, normally 24 hours after completion.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      sourceUrls: z.array(sourceUrl).min(2).max(50),
      outputFormat: z
        .string()
        .optional()
        .default('pdf')
        .describe('Only pdf is supported for merge.'),
      engine: z.string().min(1).optional(),
      tag: tagInput,
      waitForCompletion: waitInput
    })
  )
  .output(singleFileOutput)
  .handleInvocation(async ctx => {
    if (ctx.input.outputFormat !== 'pdf')
      throw invalidInput('CloudConvert merge produces PDF. outputFormat must be pdf.');
    const tasks: Tasks = {};
    const names = ctx.input.sourceUrls.map((url, index) => {
      const name = `import-file-${index}`;
      tasks[name] = { operation: 'import/url', url };
      return name;
    });
    tasks['merge-files'] = {
      operation: 'merge',
      input: names,
      output_format: 'pdf',
      ...(ctx.input.engine ? { engine: ctx.input.engine } : {})
    };
    tasks['export-file'] = { operation: 'export/url', input: ['merge-files'] };
    const job = await createAndRead(ctx, tasks, ctx.input);
    return { output: singleResult(job), message: jobMessage(job, 'Merge Files to PDF') };
  })
  .build();
