import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { docparserServiceError } from '../lib/errors';
import { spec } from '../spec';

export let importDocument = SlateTool.create(spec, {
  name: 'Import Document',
  key: 'import_document',
  description: `Import a document into a Document Parser for processing. Supports three import methods: upload a file as base64-encoded content, or fetch a document from a publicly accessible URL. An optional \`remoteId\` can be attached to correlate parsed results with your own system records.`,
  instructions: [
    'Provide exactly one of `fileContent` (base64-encoded) or `fileUrl`.',
    'When using `fileContent`, provide a `fileName` when you want Docparser to preserve a specific filename.'
  ]
})
  .input(
    z.object({
      parserId: z.string().describe('ID of the Document Parser to import into'),
      fileContent: z.string().optional().describe('Base64-encoded file content to upload'),
      fileName: z
        .string()
        .optional()
        .describe(
          'Optional filename with extension (e.g. "invoice.pdf") to associate with uploaded fileContent.'
        ),
      fileUrl: z
        .string()
        .optional()
        .describe('Publicly accessible URL to fetch the document from'),
      remoteId: z
        .string()
        .optional()
        .describe(
          'Arbitrary string to associate with this document for correlating results with your own records'
        )
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('ID of the imported document'),
      parserId: z.string().optional().describe('Parser ID returned by URL-fetch imports'),
      remoteId: z.string().optional().describe('Remote ID associated with the document'),
      fileSize: z.number().optional().describe('Imported file size in bytes when returned'),
      pageCount: z.number().describe('Number of pages in the document'),
      uploadDuration: z.number().describe('Time taken to upload in seconds'),
      quotaUsed: z.number().describe('Number of quota pages used'),
      quotaLeft: z.number().describe('Remaining quota pages'),
      quotaRefill: z.string().describe('Date when quota will be refilled'),
      message: z.string().optional().describe('Status message returned by Docparser')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { parserId, fileContent, fileName, fileUrl, remoteId } = ctx.input;
    let hasFileContent = typeof fileContent === 'string' && fileContent.trim().length > 0;
    let hasFileUrl = typeof fileUrl === 'string' && fileUrl.trim().length > 0;

    if (hasFileContent === hasFileUrl) {
      throw docparserServiceError('Provide exactly one of fileContent or fileUrl.');
    }

    if (hasFileUrl && fileUrl) {
      let result = await client.importFileByUrl(parserId, fileUrl, remoteId);
      return {
        output: result,
        message: `Document fetched from URL and imported. Document ID: \`${result.documentId}\`, pages: ${result.pageCount}.`
      };
    }

    if (hasFileContent && fileContent) {
      let result = await client.importFileByBase64(parserId, fileContent, fileName, remoteId);
      return {
        output: result,
        message: `Document uploaded and imported. Document ID: \`${result.documentId}\`, pages: ${result.pageCount}.`
      };
    }

    throw docparserServiceError('Unable to determine document import method.');
  })
  .build();
