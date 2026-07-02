import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobStatus = SlateTool.create(spec, {
  name: 'Get Job Status',
  key: 'get_job_status',
  description: `Checks the status of an asynchronous document generation job. Use the job ID returned from the Generate Document tool when a document was queued for async processing.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z
        .string()
        .describe('The job ID returned from an async document generation request.')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .optional()
        .describe(
          'Current job status (e.g., "pending", "processing", "completed", "failed").'
        ),
      pdfUrl: z
        .string()
        .optional()
        .describe('URL to download the generated PDF (available when completed).'),
      googleDocUrl: z
        .string()
        .optional()
        .describe('URL of the generated Google Doc (available when completed, if enabled).'),
      googleDriveFolderId: z
        .string()
        .optional()
        .describe('Google Drive folder ID where the PDF was saved.'),
      googleDriveFileId: z
        .string()
        .optional()
        .describe('Google Drive file ID of the saved PDF.'),
      progress: z.number().optional().describe('Processing progress percentage.'),
      error: z.string().optional().describe('Error message if the job failed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getJobStatus(ctx.input.jobId);

    let output: Record<string, unknown> = {};

    if (result.status) output.status = result.status;
    if (result.pdfUrl) output.pdfUrl = result.pdfUrl;
    if (result.googleDocUrl) output.googleDocUrl = result.googleDocUrl;
    if (result.savePdfGoogleDriveFolderId)
      output.googleDriveFolderId = result.savePdfGoogleDriveFolderId;
    if (result.savePdfGoogleDriveFileId)
      output.googleDriveFileId = result.savePdfGoogleDriveFileId;
    if (result.progress !== undefined) output.progress = result.progress;
    if (result.error) output.error = result.error;

    return {
      output: output as any,
      message: `Job **${ctx.input.jobId}** status: **${result.status || 'unknown'}**${result.pdfUrl ? `. [Download PDF](${result.pdfUrl})` : ''}`
    };
  })
  .build();
