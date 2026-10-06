import { SlateTool } from 'slates';
import { z } from 'zod';
import { invalidInput } from '../lib/errors';
import { createAndRead, jobMessage, singleResult } from '../lib/jobs';
import { singleFileOutput, sourceUrl, tagInput, waitInput } from '../lib/schemas';
import type { Tasks } from '../lib/validation';
import { spec } from '../spec';

export const generateThumbnail = SlateTool.create(spec, {
  name: 'Generate Thumbnail',
  key: 'generate_thumbnail',
  description:
    'Generate PNG, JPG, or WEBP thumbnails from a video, document, or image and provide the resulting downloadable files.',
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
      outputFormat: z.enum(['png', 'jpg', 'webp']).default('png'),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      fit: z
        .string()
        .optional()
        .describe('max, crop, scale, or contain; support depends on the input format.'),
      timestamp: z.string().optional().describe('Video timestamp such as 00:00:05.'),
      tag: tagInput,
      waitForCompletion: waitInput
    })
  )
  .output(singleFileOutput)
  .handleInvocation(async ctx => {
    if (
      ctx.input.fit !== undefined &&
      !['max', 'crop', 'scale', 'contain'].includes(ctx.input.fit)
    )
      throw invalidInput('Choose a supported thumbnail fit mode.');
    if (
      ctx.input.timestamp !== undefined &&
      !/^\d{2,}:\d{2}:\d{2}(?:\.\d+)?$/.test(ctx.input.timestamp)
    )
      throw invalidInput('timestamp must use HH:MM:SS, optionally with fractional seconds.');
    const task: Record<string, unknown> = {
      operation: 'thumbnail',
      input: ['import-file'],
      output_format: ctx.input.outputFormat
    };
    const fields = {
      input_format: ctx.input.inputFormat,
      width: ctx.input.width,
      height: ctx.input.height,
      fit: ctx.input.fit,
      timestamp: ctx.input.timestamp
    };
    for (const [key, value] of Object.entries(fields))
      if (value !== undefined) task[key] = value;
    const tasks: Tasks = {
      'import-file': { operation: 'import/url', url: ctx.input.sourceUrl },
      'generate-thumbnail': task,
      'export-file': { operation: 'export/url', input: ['generate-thumbnail'] }
    };
    const job = await createAndRead(ctx, tasks, ctx.input);
    return { output: singleResult(job), message: jobMessage(job, 'Generate Thumbnail') };
  })
  .build();
