import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

export let exportFileTool = SlateTool.create(spec, {
  name: 'Export File',
  key: 'export_file',
  description: `Export a Google Workspace file (Docs, Sheets, Slides, Drawings) to a standard format such as PDF, DOCX, XLSX, CSV, or plain text. Only works with Google Workspace native formats — for regular files use the **Download File** tool.`,
  instructions: [
    'Common export formats: application/pdf, text/plain, text/csv, text/html, application/vnd.openxmlformats-officedocument.wordprocessingml.document (DOCX), application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (XLSX), application/vnd.openxmlformats-officedocument.presentationml.presentation (PPTX).',
    'Google Docs support: PDF, DOCX, TXT, HTML, RTF, ODT, EPUB.',
    'Google Sheets support: PDF, XLSX, CSV, TSV, ODS.',
    'Google Slides support: PDF, PPTX, ODP, TXT.',
    'The exported file is returned in the response attachments.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.exportFile)
  .input(
    z.object({
      fileId: z.string().describe('ID of the Google Workspace file to export'),
      exportMimeType: z
        .string()
        .describe('Target MIME type to export to (e.g. "application/pdf", "text/csv")')
    })
  )
  .output(
    z.object({
      fileId: z.string(),
      exportMimeType: z.string(),
      byteLength: z.number().describe('Byte length of the decoded export'),
      mimeType: z
        .string()
        .optional()
        .describe('Content-Type from Google’s export response when present')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let { contentBase64, byteLength, mimeType } = await client.exportFile(
      ctx.input.fileId,
      ctx.input.exportMimeType
    );

    return {
      output: {
        fileId: ctx.input.fileId,
        exportMimeType: ctx.input.exportMimeType,
        byteLength,
        mimeType
      },
      attachments: [createBase64Attachment(contentBase64, mimeType)],
      message: `Exported file \`${ctx.input.fileId}\` as \`${ctx.input.exportMimeType}\` (${byteLength} bytes).${mimeType ? ` MIME: \`${mimeType}\`.` : ''}`
    };
  })
  .build();
