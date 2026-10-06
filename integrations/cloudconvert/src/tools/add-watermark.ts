import { SlateTool } from 'slates';
import { z } from 'zod';
import { invalidInput } from '../lib/errors';
import { createAndRead, jobMessage, singleResult } from '../lib/jobs';
import { singleFileOutput, sourceUrl, tagInput, waitInput } from '../lib/schemas';
import type { Tasks } from '../lib/validation';
import { spec } from '../spec';

export const addWatermark = SlateTool.create(spec, {
  name: 'Add Watermark',
  key: 'add_watermark',
  description:
    'Add exactly one text or image watermark to a PDF, image, or video. Watermarking keeps the input format; use convert_file for a separate format conversion.',
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
      outputFormat: z
        .string()
        .min(1)
        .describe(
          'Format of the source and watermarked result. Must match inputFormat when supplied.'
        ),
      text: z.string().min(1).optional(),
      imageUrl: sourceUrl.optional(),
      fontName: z.string().min(1).optional(),
      fontSize: z.number().positive().optional(),
      fontColor: z.string().optional(),
      position: z
        .string()
        .optional()
        .describe(
          'center, top-left, top-center, top-right, center-left, center-right, bottom-left, bottom-center, or bottom-right.'
        ),
      opacity: z.number().min(0).max(100).optional(),
      rotation: z.number().finite().optional(),
      layer: z.string().optional().describe('above or below'),
      tag: tagInput,
      waitForCompletion: waitInput
    })
  )
  .output(singleFileOutput)
  .handleInvocation(async ctx => {
    if ((ctx.input.text === undefined) === (ctx.input.imageUrl === undefined))
      throw invalidInput('Provide exactly one of text or imageUrl.');
    if (
      ctx.input.inputFormat !== undefined &&
      ctx.input.inputFormat !== ctx.input.outputFormat
    )
      throw invalidInput(
        'Watermarking does not change formats. outputFormat must match inputFormat; use convert_file separately.'
      );
    if (ctx.input.layer !== undefined && !['above', 'below'].includes(ctx.input.layer))
      throw invalidInput('layer must be above or below.');
    if (
      ctx.input.text === undefined &&
      [ctx.input.fontName, ctx.input.fontSize, ctx.input.fontColor].some(
        value => value !== undefined
      )
    )
      throw invalidInput('Font settings require a text watermark.');
    const position = ctx.input.position ?? 'center';
    const positions: Record<string, [string, string]> = {
      center: ['center', 'center'],
      'top-left': ['top', 'left'],
      'top-center': ['top', 'center'],
      'top-right': ['top', 'right'],
      'center-left': ['center', 'left'],
      'center-right': ['center', 'right'],
      'bottom-left': ['bottom', 'left'],
      'bottom-center': ['bottom', 'center'],
      'bottom-right': ['bottom', 'right']
    };
    const placement = positions[position];
    if (!placement) throw invalidInput('Choose a documented watermark position.');
    const task: Record<string, unknown> = {
      operation: 'watermark',
      input: ['import-file'],
      input_format: ctx.input.inputFormat ?? ctx.input.outputFormat,
      position_vertical: placement[0],
      position_horizontal: placement[1]
    };
    const fields = {
      text: ctx.input.text,
      font_name: ctx.input.fontName,
      font_size: ctx.input.fontSize,
      font_color: ctx.input.fontColor,
      opacity: ctx.input.opacity,
      rotation: ctx.input.rotation,
      layer: ctx.input.layer
    };
    for (const [key, value] of Object.entries(fields))
      if (value !== undefined) task[key] = value;
    const tasks: Tasks = {
      'import-file': { operation: 'import/url', url: ctx.input.sourceUrl }
    };
    if (ctx.input.imageUrl !== undefined) {
      tasks['import-watermark'] = { operation: 'import/url', url: ctx.input.imageUrl };
      task.image = 'import-watermark';
    }
    tasks['watermark-file'] = task;
    tasks['export-file'] = { operation: 'export/url', input: ['watermark-file'] };
    const job = await createAndRead(ctx, tasks, ctx.input);
    return { output: singleResult(job), message: jobMessage(job, 'Add Watermark') };
  })
  .build();
