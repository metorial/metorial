import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importDesign = SlateTool.create(spec, {
  name: 'Import Design',
  key: 'import_design',
  description: `Import an external file as a new Canva design from a URL. Supports various file formats including PDF, Adobe Creative Suite files (.ai, .psd), Microsoft Office documents, Apple productivity apps, and OpenOffice formats. This starts an asynchronous import job.`,
  constraints: [
    'Supported formats: PDF, AI, PSD, DOCX, XLSX, PPTX, KEY, NUMBERS, PAGES, ODG, ODP, ODS, ODT.'
  ]
})
  .input(
    z.object({
      title: z
        .string()
        .min(1)
        .max(50)
        .describe('Title for the imported design (max 50 characters)'),
      url: z.string().describe('URL of the file to import'),
      mimeType: z
        .string()
        .optional()
        .describe('MIME type of the file (auto-detected if omitted)')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The import job ID for checking status'),
      status: z.string().describe('Job status: "in_progress", "success", or "failed"'),
      designs: z
        .array(
          z.object({
            designId: z.string(),
            title: z.string().optional(),
            editUrl: z.string().optional(),
            viewUrl: z.string().optional(),
            createdAt: z.number(),
            updatedAt: z.number(),
            pageCount: z.number().optional()
          })
        )
        .optional()
        .describe('Imported designs (present when status is "success")'),
      errorCode: z.string().optional().describe('Error code if the import failed'),
      errorMessage: z.string().optional().describe('Error message if the import failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.createImportJobFromUrl({
      title: ctx.input.title,
      url: ctx.input.url,
      mimeType: ctx.input.mimeType
    });

    let statusMsg =
      job.status === 'success'
        ? `Import completed. ${job.designs?.length || 0} design(s) created.`
        : job.status === 'failed'
          ? `Import failed: ${job.errorMessage || job.errorCode}`
          : `Import job started (ID: ${job.jobId}). Poll for completion.`;

    return {
      output: job,
      message: statusMsg
    };
  })
  .build();

export let getImportJob = SlateTool.create(spec, {
  name: 'Get Import Job',
  key: 'get_import_job',
  description: `Check the status of a design import job. Returns imported design details when complete.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The import job ID to check')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The import job ID'),
      status: z.string().describe('Job status: "in_progress", "success", or "failed"'),
      designs: z
        .array(
          z.object({
            designId: z.string(),
            title: z.string().optional(),
            editUrl: z.string().optional(),
            viewUrl: z.string().optional(),
            createdAt: z.number(),
            updatedAt: z.number(),
            pageCount: z.number().optional()
          })
        )
        .optional()
        .describe('Imported designs'),
      errorCode: z.string().optional().describe('Error code if failed'),
      errorMessage: z.string().optional().describe('Error message if failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.getImportJob(ctx.input.jobId);

    return {
      output: job,
      message: `Import job ${job.jobId}: **${job.status}**.${job.designs ? ` ${job.designs.length} design(s) imported.` : ''}`
    };
  })
  .build();
