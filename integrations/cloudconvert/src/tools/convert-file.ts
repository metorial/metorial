import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAndRead, jobMessage } from '../lib/jobs';
import {
  optionsInput,
  resultFileOutput,
  sourceUrl,
  tagInput,
  waitInput
} from '../lib/schemas';
import { applyOptions, type Tasks } from '../lib/validation';
import { spec } from '../spec';
export const convertFile = SlateTool.create(spec, {
  name: 'Convert File',
  key: 'convert_file',
  description:
    'Convert a file at a public URL to another format and provide all resulting downloadable files.',
  constraints: [
    'Production conversions consume credits. Sandbox processes only whitelisted files.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      sourceUrl,
      inputFormat: z.string().min(1).optional(),
      outputFormat: z.string().min(1),
      engine: z.string().min(1).optional(),
      engineVersion: z.string().min(1).optional(),
      filename: z.string().min(1).optional(),
      options: optionsInput,
      tag: tagInput,
      waitForCompletion: waitInput
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      status: z.string(),
      tasks: z.array(
        z.object({
          taskId: z.string(),
          operation: z.string(),
          status: z.string(),
          resultUrl: z.string().optional(),
          resultFilename: z.string().optional(),
          resultFiles: z.array(resultFileOutput).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const task: Record<string, unknown> = {
      operation: 'convert',
      input: ['import-file'],
      output_format: ctx.input.outputFormat
    };
    const fields = {
      input_format: ctx.input.inputFormat,
      engine: ctx.input.engine,
      engine_version: ctx.input.engineVersion,
      filename: ctx.input.filename
    };
    for (const [key, value] of Object.entries(fields))
      if (value !== undefined) task[key] = value;
    applyOptions(task, ctx.input.options);
    const tasks: Tasks = {
      'import-file': { operation: 'import/url', url: ctx.input.sourceUrl },
      'convert-file': task,
      'export-file': { operation: 'export/url', input: ['convert-file'] }
    };
    const job = await createAndRead(ctx, tasks, ctx.input);
    return {
      output: {
        jobId: job.id,
        status: job.status,
        tasks: job.tasks.map(task => ({
          taskId: task.id,
          operation: task.operation,
          status: task.status,
          resultUrl: task.result?.files?.[0]?.url,
          resultFilename: task.result?.files?.[0]?.filename,
          resultFiles: task.result?.files
        }))
      },
      message: jobMessage(job, 'Conversion')
    };
  })
  .build();
