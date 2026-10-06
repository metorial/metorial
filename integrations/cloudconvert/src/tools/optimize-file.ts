import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAndRead, jobMessage, singleResult } from '../lib/jobs';
import {
  optionsInput,
  singleFileOutput,
  sourceUrl,
  tagInput,
  waitInput
} from '../lib/schemas';
import type { Tasks } from '../lib/validation';
import { applyOptions } from '../lib/validation';
import { spec } from '../spec';

export const optimizeFile = SlateTool.create(spec, {
  name: 'Optimize File',
  key: 'optimize_file',
  description:
    'Optimize a PDF, PNG, or JPG from a public URL and provide the resulting downloadable files. Engine-specific options depend on the input format.',
  constraints: [
    'Production processing can consume conversion credits. Sandbox only accepts whitelisted files.',
    'Download result files before the job is deleted, normally 24 hours after completion.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      sourceUrl,
      inputFormat: z.string().min(1).optional(),
      options: optionsInput,
      tag: tagInput,
      waitForCompletion: waitInput
    })
  )
  .output(singleFileOutput)
  .handleInvocation(async ctx => {
    const task: Record<string, unknown> = { operation: 'optimize', input: ['import-file'] };
    if (ctx.input.inputFormat !== undefined) task.input_format = ctx.input.inputFormat;
    applyOptions(task, ctx.input.options);
    const tasks: Tasks = {
      'import-file': { operation: 'import/url', url: ctx.input.sourceUrl },
      'optimize-file': task,
      'export-file': { operation: 'export/url', input: ['optimize-file'] }
    };
    const job = await createAndRead(ctx, tasks, ctx.input);
    return { output: singleResult(job), message: jobMessage(job, 'Optimize File') };
  })
  .build();
