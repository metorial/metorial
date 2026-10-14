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
        .describe('Current job status (waiting, active, completed, or failed).'),
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
      error: z.string().optional().describe('Error message if the job failed.'),
      signingSessionId: z
        .string()
        .optional()
        .describe('Signing session ID when the completed job starts an e-signature workflow.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getJobStatus(ctx.input.jobId);

    let document = result.result ?? result;
    let output = {
      status: result.status ?? undefined,
      pdfUrl: document.pdfUrl ?? undefined,
      googleDocUrl: document.googleDocUrl ?? undefined,
      googleDriveFolderId: document.savePdfGoogleDriveFolderId ?? undefined,
      googleDriveFileId: document.savePdfGoogleDriveFileId ?? undefined,
      progress: result.progress ?? undefined,
      error: result.error ?? undefined,
      signingSessionId: document.signingSessionId ?? undefined
    };

    if (document.pdfUrl) {
      await ctx.addAttachment({
        type: 'url',
        url: document.pdfUrl,
        mimeType: 'application/pdf'
      });
    }

    return {
      output,
      message: `Job **${ctx.input.jobId}** status: **${result.status || 'unknown'}**${document.pdfUrl ? `. [Download PDF](${document.pdfUrl})` : ''}`
    };
  })
  .build();
