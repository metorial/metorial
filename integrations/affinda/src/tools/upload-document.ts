import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { affindaServiceError } from '../lib/errors';
import { spec } from '../spec';

export let uploadDocument = SlateTool.create(spec, {
  name: 'Upload Document',
  key: 'upload_document',
  description: `Upload a document to Affinda for AI-powered parsing and data extraction. Supports uploading via a publicly accessible URL. The document will be processed according to the workspace or collection configuration, extracting structured data such as resume fields, invoice line items, or other document-specific data points.

Set **wait** to \`true\` to receive parsed results immediately, or \`false\` to get the document identifier and poll later.`,
  instructions: [
    'Provide exactly one document source: fileContentBase64 or url.',
    'If uploading to a workspace without specifying a collection, the document will be automatically classified and routed.',
    'If uploading to a specific collection, the extractor associated with that collection will be applied.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z
        .string()
        .optional()
        .describe('Publicly accessible URL of the document to process.'),
      fileContentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded document file content to upload directly.'),
      workspaceIdentifier: z
        .string()
        .optional()
        .describe(
          'Workspace identifier to upload the document to. Falls back to the configured default workspace.'
        ),
      collectionIdentifier: z
        .string()
        .optional()
        .describe(
          'Collection identifier to upload to. If omitted, the document is classified and routed automatically within the workspace.'
        ),
      documentTypeIdentifier: z
        .string()
        .optional()
        .describe('Document type identifier. If specified, workspace must also be specified.'),
      wait: z
        .boolean()
        .default(true)
        .describe(
          'If true, waits for parsing to complete and returns extracted data. If false, returns immediately with document metadata.'
        ),
      identifier: z.string().optional().describe('Custom document identifier to assign.'),
      customIdentifier: z
        .string()
        .optional()
        .describe('Additional custom identifier for external reference.'),
      fileName: z
        .string()
        .optional()
        .describe('File name for file uploads or override file name for URL uploads.'),
      fileMimeType: z.string().optional().describe('MIME type for fileContentBase64 uploads.'),
      expiryTime: z
        .string()
        .optional()
        .describe('ISO-8601 date-time when Affinda should automatically delete the document.'),
      language: z
        .string()
        .optional()
        .describe('Language code hint for the document (e.g., "en", "fr").'),
      rejectDuplicates: z
        .boolean()
        .optional()
        .describe('If true, rejects duplicate documents without consuming credits.'),
      lowPriority: z.boolean().optional().describe('Mark as low priority for processing.'),
      compact: z
        .boolean()
        .optional()
        .describe('If true and wait is true, returns a compact version of the parsed result.'),
      deleteAfterParse: z
        .boolean()
        .optional()
        .describe(
          'If true, deletes the document data after parsing. Only works with wait: true.'
        ),
      enableValidationTool: z
        .boolean()
        .optional()
        .describe('If true, makes the document viewable in the Affinda validation interface.'),
      useOcr: z
        .boolean()
        .optional()
        .describe('Force OCR on or off. If omitted, Affinda chooses automatically.'),
      llmHint: z
        .string()
        .optional()
        .describe(
          'Optional hint inserted into the LLM prompt while processing this document.'
        ),
      limitToExamples: z
        .array(z.string())
        .optional()
        .describe('Restrict LLM example selection to these document identifiers.')
    })
  )
  .output(
    z.object({
      documentIdentifier: z.string().describe('Unique identifier of the uploaded document.'),
      fileName: z.string().optional().describe('Name of the processed file.'),
      state: z.string().optional().describe('Current processing state of the document.'),
      ready: z.boolean().optional().describe('Whether the document has finished processing.'),
      failed: z.boolean().optional().describe('Whether parsing has failed.'),
      customIdentifier: z
        .string()
        .optional()
        .describe('Custom identifier assigned to the document.'),
      reviewUrl: z
        .string()
        .optional()
        .describe('Affinda validation/review URL for the document.'),
      extractedData: z
        .any()
        .optional()
        .describe(
          'Structured JSON data extracted from the document (only present when wait is true).'
        ),
      warnings: z.array(z.any()).optional().describe('Warnings returned by Affinda.')
    })
  )
  .handleInvocation(async ctx => {
    let hasUrl = typeof ctx.input.url === 'string' && ctx.input.url.length > 0;
    let hasFile =
      typeof ctx.input.fileContentBase64 === 'string' &&
      ctx.input.fileContentBase64.length > 0;

    if (hasUrl === hasFile) {
      throw affindaServiceError('Provide exactly one of url or fileContentBase64.');
    }

    if (hasFile && !ctx.input.fileName) {
      throw affindaServiceError('fileName is required when uploading fileContentBase64.');
    }

    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let workspace = ctx.input.workspaceIdentifier ?? ctx.config.workspaceIdentifier;

    ctx.info('Uploading document to Affinda...');

    let result = await client.uploadDocument({
      file: hasFile
        ? {
            name: ctx.input.fileName!,
            data: ctx.input.fileContentBase64!,
            mimeType: ctx.input.fileMimeType
          }
        : undefined,
      url: ctx.input.url,
      workspace,
      collection: ctx.input.collectionIdentifier,
      documentType: ctx.input.documentTypeIdentifier,
      wait: ctx.input.wait,
      identifier: ctx.input.identifier,
      customIdentifier: ctx.input.customIdentifier,
      fileName: ctx.input.fileName,
      expiryTime: ctx.input.expiryTime,
      language: ctx.input.language,
      rejectDuplicates: ctx.input.rejectDuplicates,
      lowPriority: ctx.input.lowPriority,
      compact: ctx.input.compact,
      deleteAfterParse: ctx.input.deleteAfterParse,
      enableValidationTool: ctx.input.enableValidationTool,
      useOcr: ctx.input.useOcr,
      llmHint: ctx.input.llmHint,
      limitToExamples: ctx.input.limitToExamples
    });
    let meta = result.meta ?? result;

    return {
      output: {
        documentIdentifier: meta.identifier ?? '',
        fileName: meta.fileName,
        state: meta.state,
        ready: meta.ready,
        failed: meta.failed,
        customIdentifier: meta.customIdentifier,
        reviewUrl: meta.reviewUrl,
        extractedData: result.data,
        warnings: result.warnings
      },
      message: ctx.input.wait
        ? `Document **${meta.fileName ?? 'uploaded'}** has been parsed successfully.`
        : `Document uploaded and processing has started. Document identifier: \`${meta.identifier}\``
    };
  })
  .build();
