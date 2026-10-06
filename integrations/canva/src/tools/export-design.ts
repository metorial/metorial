import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type ExportFormat } from '../lib/client';
import { fail } from '../lib/validation';
import { spec } from '../spec';

export let exportDesign = SlateTool.create(spec, {
  name: 'Export Design',
  key: 'export_design',
  description: `Export a Canva design to a downloadable file. Supports PDF, JPG, PNG, GIF, PPTX, and MP4 formats. This starts an asynchronous export job. If the job completes immediately, download URLs are returned; otherwise use the job ID to poll for completion.`,
  instructions: [
    'Download URLs expire 24 hours after export completion; polling does not renew them. Start a new export explicitly if the result has expired.',
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
        .describe('Specific one-based page numbers to export; the first page is 1')
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
    let client = Client.fromContext(ctx);

    const input = ctx.input;
    const allowed: Record<string, string[]> = {
      pdf: ['exportQuality', 'pdfSize'],
      jpg: ['quality', 'width', 'height', 'exportQuality'],
      png: [
        'width',
        'height',
        'lossless',
        'transparentBackground',
        'asSingleImage',
        'exportQuality'
      ],
      gif: ['width', 'height', 'exportQuality'],
      pptx: [],
      mp4: ['mp4Quality', 'exportQuality']
    };
    for (const field of [
      'quality',
      'width',
      'height',
      'lossless',
      'transparentBackground',
      'asSingleImage',
      'exportQuality',
      'pdfSize',
      'mp4Quality'
    ] as const) {
      if (input[field] !== undefined && !allowed[input.formatType]?.includes(field))
        fail(
          `The ${field} option is not supported for ${input.formatType} exports. Remove it before exporting.`
        );
    }
    let format: ExportFormat;
    const pages = input.pages;
    const export_quality = input.exportQuality;
    switch (input.formatType) {
      case 'jpg':
        if (input.quality === undefined) fail('JPG export requires quality from 1 to 100.');
        format = {
          type: 'jpg',
          quality: input.quality,
          width: input.width,
          height: input.height,
          export_quality,
          pages
        };
        break;
      case 'png':
        format = {
          type: 'png',
          width: input.width,
          height: input.height,
          lossless: input.lossless,
          transparent_background: input.transparentBackground,
          as_single_image: input.asSingleImage,
          export_quality,
          pages
        };
        break;
      case 'gif':
        format = {
          type: 'gif',
          width: input.width,
          height: input.height,
          export_quality,
          pages
        };
        break;
      case 'pdf':
        format = { type: 'pdf', size: input.pdfSize, export_quality, pages };
        break;
      case 'pptx':
        format = { type: 'pptx', pages };
        break;
      case 'mp4':
        if (input.mp4Quality === undefined)
          fail('MP4 export requires a documented horizontal or vertical quality.');
        format = { type: 'mp4', quality: input.mp4Quality, export_quality, pages };
        break;
    }

    let job = await client.createExportJob({
      designId: ctx.input.designId,
      format
    });

    for (const url of job.downloadUrls ?? []) await ctx.addAttachment({ type: 'url', url });

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
  description: `Check the status of a design export job. Returns downloadable files and legacy download URLs when complete. URLs expire 24 hours after completion; polling cannot renew an expired result.`,
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
    let client = Client.fromContext(ctx);
    let job = await client.getExportJob(ctx.input.jobId);
    for (const url of job.downloadUrls ?? []) await ctx.addAttachment({ type: 'url', url });

    return {
      output: job,
      message: `Export job ${job.jobId}: **${job.status}**.${job.downloadUrls ? ` ${job.downloadUrls.length} file(s) ready.` : ''}`
    };
  })
  .build();
