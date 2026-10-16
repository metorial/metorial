import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type UploadResponse } from '../lib/client';
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
      extractorId: z
        .string()
        .describe('Extractor ID from list_extractors to process the document with'),
      folderId: z.string().describe('Folder ID from list_folders to upload the document into'),
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
      uploadedAt: z.string().describe('Timestamp when the document was uploaded (ISO 8601)'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete upload response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let { extractorId, folderId, url, fileBase64, filename } = ctx.input;

    let hasUrl = url !== undefined;
    let hasBase64 = fileBase64 !== undefined || filename !== undefined;
    if (hasUrl === hasBase64) {
      throw createApiServiceError(
        'Provide either url or both fileBase64 and filename, using one upload method.'
      );
    }
    if (url !== undefined) {
      let parsed = z.url().safeParse(url);
      if (!parsed.success || !/^https?:\/\//i.test(url)) {
        throw createApiServiceError('url must be a publicly accessible HTTP or HTTPS URL.');
      }
    }
    if (hasBase64 && (!fileBase64?.trim() || !filename?.trim())) {
      throw createApiServiceError('Provide both non-empty fileBase64 and filename.');
    }
    let result: UploadResponse;

    if (url) {
      ctx.info('Uploading document from URL');
      result = await client.uploadDocumentUrl(extractorId, folderId, url);
    } else if (fileBase64 && filename) {
      ctx.info('Uploading base64-encoded document');
      result = await client.uploadDocumentBase64(extractorId, folderId, fileBase64, filename);
    } else {
      throw createApiServiceError('Provide either url or both fileBase64 and filename.');
    }

    return {
      output: {
        documentId: String(result.id),
        fileSize: result.fileSize,
        fileMd5Checksum: result.fileMD5CheckSum,
        uploadedAt: result.uploadedAt,
        raw: result
      },
      message: `Document uploaded successfully with ID \`${result.id}\`. File size: ${result.fileSize} bytes.`
    };
  })
  .build();
