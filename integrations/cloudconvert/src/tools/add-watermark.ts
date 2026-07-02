import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addWatermark = SlateTool.create(spec, {
  name: 'Add Watermark',
  key: 'add_watermark',
  description: `Add a text or image watermark to a PDF, image (PNG, JPG), or video (MP4, MOV) file.

Configure the watermark appearance with font, size, color, position, opacity, and rotation options.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the file to watermark'),
      inputFormat: z
        .string()
        .optional()
        .describe('File format (e.g., "pdf", "png", "mp4"). Auto-detected if omitted.'),
      outputFormat: z.string().describe('Output format for the watermarked file'),
      text: z.string().optional().describe('Watermark text (use this or imageUrl, not both)'),
      imageUrl: z
        .string()
        .optional()
        .describe('URL of the watermark image (use this or text, not both)'),
      fontName: z.string().optional().describe('Font name for text watermark'),
      fontSize: z.number().optional().describe('Font size for text watermark'),
      fontColor: z.string().optional().describe('Font color as hex (e.g., "#FF0000")'),
      position: z
        .string()
        .optional()
        .describe('Watermark position (e.g., "center", "top-right", "bottom-left")'),
      opacity: z.number().optional().describe('Watermark opacity from 0 to 100'),
      rotation: z.number().optional().describe('Rotation angle in degrees'),
      layer: z.string().optional().describe('Layer placement: "above" or "below" content'),
      tag: z.string().optional().describe('Tag to label the job'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for watermarking to complete')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the watermark job'),
      status: z.string().describe('Current status of the job'),
      resultUrl: z
        .string()
        .optional()
        .describe('Temporary download URL for the watermarked file'),
      resultFilename: z.string().optional().describe('Filename of the watermarked file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let watermarkTask: Record<string, any> = {
      operation: 'watermark',
      input: ['import-file'],
      output_format: ctx.input.outputFormat
    };

    if (ctx.input.inputFormat) watermarkTask.input_format = ctx.input.inputFormat;
    if (ctx.input.text) watermarkTask.text = ctx.input.text;
    if (ctx.input.fontName) watermarkTask.font_name = ctx.input.fontName;
    if (ctx.input.fontSize) watermarkTask.font_size = ctx.input.fontSize;
    if (ctx.input.fontColor) watermarkTask.font_color = ctx.input.fontColor;
    if (ctx.input.position) watermarkTask.position = ctx.input.position;
    if (ctx.input.opacity !== undefined) watermarkTask.opacity = ctx.input.opacity;
    if (ctx.input.rotation !== undefined) watermarkTask.rotation = ctx.input.rotation;
    if (ctx.input.layer) watermarkTask.layer = ctx.input.layer;

    let tasksConfig: Record<string, any> = {
      'import-file': {
        operation: 'import/url',
        url: ctx.input.sourceUrl
      }
    };

    if (ctx.input.imageUrl) {
      tasksConfig['import-watermark'] = {
        operation: 'import/url',
        url: ctx.input.imageUrl
      };
      watermarkTask.input = ['import-file'];
      watermarkTask.input_watermark = ['import-watermark'];
    }

    tasksConfig['watermark-file'] = watermarkTask;
    tasksConfig['export-file'] = {
      operation: 'export/url',
      input: ['watermark-file']
    };

    let job = await client.createJob(tasksConfig, ctx.input.tag);

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
          ? `Watermark added successfully. ${resultFile?.url ? `Download: ${resultFile.url}` : ''}`
          : `Watermark job created (status: ${job.status}).`
    };
  })
  .build();
