import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadDocument = SlateTool.create(spec, {
  name: 'Upload Document',
  key: 'upload_document',
  description: `Uploads a document to Algodocs for data extraction. Supports uploading via a public URL or a base64-encoded file. The document will be processed by the specified extractor, and extracted data can be retrieved later using the document ID.`,
  instructions: [
    'Provide either a **url** or both **fileBase64** and **filename** — not both methods at once.',
    'Accepted file types: PDF, PNG, JPG/JPEG, Word (.doc, .docx), Excel (.xls, .xlsx).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      extractorId: z.string().describe('ID of the extractor to process the document with'),
      folderId: z.string().describe('ID of the folder to upload the document into'),
      url: z.string().optional().describe('Publicly accessible URL of the file to upload'),
      fileBase64: z
        .string()
        .optional()
        .describe('Base64-encoded content of the file to upload'),
      filename: z
        .string()
        .optional()
        .describe('Filename for the base64-encoded file (required when using fileBase64)')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique identifier of the uploaded document'),
      fileSize: z.number().describe('Size of the uploaded file in bytes'),
      fileMd5Checksum: z.string().describe('MD5 checksum of the uploaded file'),
      uploadedAt: z.string().describe('Timestamp when the document was uploaded (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let { extractorId, folderId, url, fileBase64, filename } = ctx.input;

    let result: any;

    if (url) {
      ctx.info('Uploading document from URL');
      result = await client.uploadDocumentUrl(extractorId, folderId, url);
    } else if (fileBase64 && filename) {
      ctx.info('Uploading base64-encoded document');
      result = await client.uploadDocumentBase64(extractorId, folderId, fileBase64, filename);
    } else {
      throw new Error('Provide either a "url" or both "fileBase64" and "filename".');
    }

    return {
      output: {
        documentId: result.id,
        fileSize: result.fileSize,
        fileMd5Checksum: result.fileMD5CheckSum,
        uploadedAt: result.uploadedAt
      },
      message: `Document uploaded successfully with ID \`${result.id}\`. File size: ${result.fileSize} bytes.`
    };
  })
  .build();
