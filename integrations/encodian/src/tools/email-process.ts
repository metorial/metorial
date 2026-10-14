import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let emailProcess = SlateTool.create(spec, {
  name: 'Process Email',
  key: 'process_email',
  description: `Extract attachments and metadata from email message files (MSG, EML). Returns email properties like sender, recipients, subject, dates, and body content, as well as any file attachments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['extract_attachments', 'extract_metadata'])
        .describe('Whether to extract attachments or metadata'),
      fileContent: z.string().describe('Base64-encoded email file content (MSG or EML)'),
      fileName: z.string().optional().describe('Email filename with extension'),
      getInlineAttachments: z
        .boolean()
        .optional()
        .describe('Include inline/embedded attachments (for extract_attachments)')
    })
  )
  .output(
    z.object({
      attachments: z
        .array(
          z.object({
            fileName: z.string().describe('Attachment filename'),
            fileContent: z.string().describe('Base64-encoded attachment content')
          })
        )
        .optional()
        .describe('Extracted email attachments'),
      emailMetadata: z
        .any()
        .optional()
        .describe('Email metadata (sender, recipients, subject, dates, body, etc.)'),
      operationStatus: z.string().describe('Encodian operation status'),
      statusUrl: z.string().optional().describe('Status URL for a queued operation'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, input => ctx.addAttachment(input));

    if (ctx.input.operation === 'extract_attachments') {
      let body: Record<string, any> = {
        fileContent: ctx.input.fileContent,
        fileName: ctx.input.fileName || 'email.eml',
        getInlineAttachments: ctx.input.getInlineAttachments ?? true
      };
      if (ctx.input.fileName) body.fileName = ctx.input.fileName;
      if (ctx.input.getInlineAttachments !== undefined)
        body.getInlineAttachments = ctx.input.getInlineAttachments;

      let result = await client.getEmailAttachments(body);

      return {
        output: {
          attachments: (result.documents || []).map((d: any) => ({
            fileName: d.fileName,
            fileContent: d.fileContent
          })),
          operationStatus: client.operationStatus,
          statusUrl: client.statusUrl,
          operationId: result.OperationId
        },
        message: client.message(
          `Extracted **${result.documents?.length || 0} attachments** from email.`
        )
      };
    } else {
      let result = await client.getEmailMetadata({
        fileContent: ctx.input.fileContent
      });

      return {
        output: {
          emailMetadata: result,
          operationStatus: client.operationStatus,
          statusUrl: client.statusUrl,
          operationId: result.OperationId || ''
        },
        message: client.message(`Successfully extracted email metadata.`)
      };
    }
  })
  .build();
