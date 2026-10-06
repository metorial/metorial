import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';
export const downloadApplicationAttachmentTool = SlateTool.create(spec, {
  key: 'download_application_attachment',
  name: 'Download Application File',
  description:
    'Prepare a downloadable resume, cover letter or other application file. Verifies that the selected file belongs to the application. Greenhouse file links last seven days and can be renewed.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      applicationId: z
        .string()
        .describe('Application ID from list_applications or get_application.'),
      attachmentId: z
        .string()
        .describe('File ID from list_application_attachments for that application.')
    })
  )
  .output(
    z.object({
      applicationId: z.string(),
      attachmentId: z.string(),
      fileName: z.string(),
      type: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const file = await new GreenhouseClient(ctx.auth, ctx.config).getApplicationFile(
      ctx.input.applicationId,
      ctx.input.attachmentId
    );
    await ctx.addAttachment({
      type: 'url',
      url: file.url,
      filename: file.fileName,
      refreshAt: file.expiresAt,
      refreshReference: { applicationId: file.applicationId, attachmentId: file.attachmentId }
    });
    return {
      output: {
        applicationId: file.applicationId,
        attachmentId: file.attachmentId,
        fileName: file.fileName,
        type: file.type
      },
      message: 'Prepared the application file for download.'
    };
  })
  .build();
