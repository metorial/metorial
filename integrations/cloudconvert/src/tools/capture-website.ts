import { SlateTool } from 'slates';
import { z } from 'zod';
import { invalidInput } from '../lib/errors';
import { createAndRead, jobMessage, singleResult } from '../lib/jobs';
import { singleFileOutput, sourceUrl, tagInput, waitInput } from '../lib/schemas';
import type { Tasks } from '../lib/validation';
import { spec } from '../spec';

export const captureWebsite = SlateTool.create(spec, {
  name: 'Capture Website',
  key: 'capture_website',
  description:
    'Capture a website as PDF, PNG, or JPG and provide the resulting downloadable files. Optional page settings depend on the selected output format.',
  constraints: [
    'Production processing can consume conversion credits. Sandbox only accepts whitelisted files.',
    'Download result files before the job is deleted, normally 24 hours after completion.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      websiteUrl: sourceUrl,
      outputFormat: z.enum(['pdf', 'png', 'jpg']),
      pageWidth: z.number().int().positive().optional().describe('Viewport width in pixels.'),
      pageHeight: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Viewport height in pixels.'),
      marginTop: z.number().nonnegative().optional(),
      marginBottom: z.number().nonnegative().optional(),
      marginLeft: z.number().nonnegative().optional(),
      marginRight: z.number().nonnegative().optional(),
      printBackground: z.boolean().optional(),
      displayHeaderFooter: z.boolean().optional(),
      waitUntil: z
        .string()
        .optional()
        .describe(
          'Navigation condition: load, domcontentloaded, networkidle0, or networkidle2.'
        ),
      waitTime: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Additional wait in milliseconds.'),
      tag: tagInput,
      waitForCompletion: waitInput
    })
  )
  .output(singleFileOutput)
  .handleInvocation(async ctx => {
    if (
      ctx.input.outputFormat !== 'pdf' &&
      [
        ctx.input.marginTop,
        ctx.input.marginBottom,
        ctx.input.marginLeft,
        ctx.input.marginRight,
        ctx.input.printBackground,
        ctx.input.displayHeaderFooter
      ].some(value => value !== undefined)
    )
      throw invalidInput('Margins and print/header options apply only to PDF capture.');
    if (
      ctx.input.waitUntil !== undefined &&
      !['load', 'domcontentloaded', 'networkidle0', 'networkidle2'].includes(
        ctx.input.waitUntil
      )
    )
      throw invalidInput('Choose a supported navigation wait condition.');
    const task: Record<string, unknown> = {
      operation: 'capture-website',
      url: ctx.input.websiteUrl,
      output_format: ctx.input.outputFormat
    };
    const fields = {
      screen_width: ctx.input.pageWidth,
      screen_height: ctx.input.pageHeight,
      margin_top: ctx.input.marginTop,
      margin_bottom: ctx.input.marginBottom,
      margin_left: ctx.input.marginLeft,
      margin_right: ctx.input.marginRight,
      print_background: ctx.input.printBackground,
      display_header_footer: ctx.input.displayHeaderFooter,
      wait_until: ctx.input.waitUntil,
      wait_time: ctx.input.waitTime
    };
    for (const [key, value] of Object.entries(fields))
      if (value !== undefined) task[key] = value;
    const tasks: Tasks = {
      'capture-website': task,
      'export-file': { operation: 'export/url', input: ['capture-website'] }
    };
    const job = await createAndRead(ctx, tasks, ctx.input);
    return { output: singleResult(job), message: jobMessage(job, 'Capture Website') };
  })
  .build();
