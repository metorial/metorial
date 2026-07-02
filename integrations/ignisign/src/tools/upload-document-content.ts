import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let uploadDocumentContent = SlateTool.create(spec, {
  name: 'Upload Document Content',
  key: 'upload_document_content',
  description: `Upload content to a previously initialized document. Supports file content (base64-encoded for PDF/images) or structured JSON data.`,
  instructions: [
    'The document must be initialized first using the "Manage Document" tool with action "init".',
    'For file uploads, provide base64-encoded content with the appropriate fileName and contentType.',
    'For JSON data, provide the jsonContent object directly.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the initialized document'),
      uploadType: z.enum(['file', 'data_json']).describe('Type of content to upload'),
      fileContentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded file content (for file upload)'),
      fileName: z
        .string()
        .optional()
        .describe('File name including extension, e.g., "contract.pdf" (for file upload)'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the file, e.g., "application/pdf" (for file upload)'),
      jsonContent: z
        .record(z.string(), z.any())
        .optional()
        .describe('Structured JSON data (for data_json upload)')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      uploadType: z.string().describe('Type of content uploaded'),
      document: z.any().optional().describe('Updated document data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    if (ctx.input.uploadType === 'file') {
      if (!ctx.input.fileContentBase64 || !ctx.input.fileName || !ctx.input.contentType) {
        throw new Error(
          'fileContentBase64, fileName, and contentType are required for file upload'
        );
      }
      let result = await client.uploadDocumentFile(
        ctx.input.documentId,
        ctx.input.fileContentBase64,
        ctx.input.fileName,
        ctx.input.contentType
      );
      return {
        output: {
          documentId: ctx.input.documentId,
          uploadType: 'file',
          document: result
        },
        message: `File "${ctx.input.fileName}" uploaded to document **${ctx.input.documentId}**.`
      };
    }

    if (!ctx.input.jsonContent) {
      throw new Error('jsonContent is required for data_json upload');
    }
    let result = await client.uploadDocumentDataJson(
      ctx.input.documentId,
      ctx.input.jsonContent
    );
    return {
      output: {
        documentId: ctx.input.documentId,
        uploadType: 'data_json',
        document: result
      },
      message: `JSON data uploaded to document **${ctx.input.documentId}**.`
    };
  })
  .build();
