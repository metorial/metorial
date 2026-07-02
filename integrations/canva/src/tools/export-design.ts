import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportDesign = SlateTool.create(spec, {
  name: 'Export Design',
  key: 'export_design',
  description: `Export a Canva design to a downloadable file. Supports PDF, JPG, PNG, GIF, PPTX, and MP4 formats. This starts an asynchronous export job. If the job completes immediately, download URLs are returned; otherwise use the job ID to poll for completion.`,
  instructions: [
    'Download URLs are valid for 24 hours.',
    'Multi-page designs return multiple URLs sorted by page order.'
  ],
  constraints: [
    'Docs can only be exported as PDF.',
    'Whiteboards support PDF, JPEG, PNG.',
    'Custom dimensions: 40-25000 pixels for JPG/PNG/GIF.'
  ]
})
  .input(
    z.object({
      designId: z.string().describe('The ID of the design to export'),
      formatType: z
        .enum(['pdf', 'jpg', 'png', 'gif', 'pptx', 'mp4'])
        .describe('Export format'),
      quality: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Image quality for JPG exports (1-100)'),
      width: z
        .number()
        .min(40)
        .max(25000)
        .optional()
        .describe('Output width in pixels (JPG, PNG, GIF)'),
      height: z
        .number()
        .min(40)
        .max(25000)
        .optional()
        .describe('Output height in pixels (JPG, PNG, GIF)'),
      transparentBackground: z
        .boolean()
        .optional()
        .describe('Use transparent background for PNG exports'),
      asSingleImage: z
        .boolean()
        .optional()
        .describe('Export all pages as a single image for PNG exports'),
      lossless: z.boolean().optional().describe('Use lossless compression for PNG exports'),
      exportQuality: z.enum(['regular', 'pro']).optional().describe('Export quality tier'),
      pdfSize: z
        .enum(['a4', 'a3', 'letter', 'legal'])
        .optional()
        .describe('Page size for PDF exports'),
      mp4Quality: z
        .string()
        .optional()
        .describe('Video quality for MP4 exports (e.g., "horizontal_1080p")'),
      pages: z
        .array(z.number())
        .optional()
        .describe('Specific page indices to export (0-based)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The export job ID'),
      status: z.string().describe('Job status: "in_progress", "success", or "failed"'),
      downloadUrls: z
        .array(z.string())
        .optional()
        .describe('Download URLs (valid for 24 hours, present when status is "success")'),
      errorCode: z.string().optional().describe('Error code if the export failed'),
      errorMessage: z.string().optional().describe('Error message if the export failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let format: Record<string, unknown> = { type: ctx.input.formatType };

    if (ctx.input.formatType === 'jpg') {
      if (ctx.input.quality) format.quality = ctx.input.quality;
      if (ctx.input.width) format.width = ctx.input.width;
      if (ctx.input.height) format.height = ctx.input.height;
      if (ctx.input.exportQuality) format.export_quality = ctx.input.exportQuality;
    } else if (ctx.input.formatType === 'png') {
      if (ctx.input.width) format.width = ctx.input.width;
      if (ctx.input.height) format.height = ctx.input.height;
      if (ctx.input.lossless !== undefined) format.lossless = ctx.input.lossless;
      if (ctx.input.transparentBackground !== undefined)
        format.transparent_background = ctx.input.transparentBackground;
      if (ctx.input.asSingleImage !== undefined)
        format.as_single_image = ctx.input.asSingleImage;
      if (ctx.input.exportQuality) format.export_quality = ctx.input.exportQuality;
    } else if (ctx.input.formatType === 'pdf') {
      if (ctx.input.exportQuality) format.export_quality = ctx.input.exportQuality;
      if (ctx.input.pdfSize) format.size = ctx.input.pdfSize;
    } else if (ctx.input.formatType === 'gif') {
      if (ctx.input.width) format.width = ctx.input.width;
      if (ctx.input.height) format.height = ctx.input.height;
      if (ctx.input.exportQuality) format.export_quality = ctx.input.exportQuality;
    } else if (ctx.input.formatType === 'mp4') {
      if (ctx.input.mp4Quality) format.quality = ctx.input.mp4Quality;
      if (ctx.input.exportQuality) format.export_quality = ctx.input.exportQuality;
    }

    if (ctx.input.pages) format.pages = ctx.input.pages;

    let job = await client.createExportJob({
      designId: ctx.input.designId,
      format: format as any
    });

    let statusMsg =
      job.status === 'success'
        ? `Export completed. ${job.downloadUrls?.length || 0} download URL(s) available.`
        : job.status === 'failed'
          ? `Export failed: ${job.errorMessage || job.errorCode}`
          : `Export job started (ID: ${job.jobId}). Poll for completion.`;

    return {
      output: job,
      message: statusMsg
    };
  })
  .build();

export let getExportJob = SlateTool.create(spec, {
  name: 'Get Export Job',
  key: 'get_export_job',
  description: `Check the status of a design export job. Returns download URLs when the export is complete.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The export job ID to check')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The export job ID'),
      status: z.string().describe('Job status: "in_progress", "success", or "failed"'),
      downloadUrls: z
        .array(z.string())
        .optional()
        .describe('Download URLs (valid for 24 hours)'),
      errorCode: z.string().optional().describe('Error code if failed'),
      errorMessage: z.string().optional().describe('Error message if failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.getExportJob(ctx.input.jobId);

    return {
      output: job,
      message: `Export job ${job.jobId}: **${job.status}**.${job.downloadUrls ? ` ${job.downloadUrls.length} file(s) ready.` : ''}`
    };
  })
  .build();
