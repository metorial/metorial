import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let uploadDocument = SlateTool.create(spec, {
  name: 'Upload Document',
  key: 'upload_document',
  description: `Upload a document to Affinda for AI-powered parsing and data extraction. Supports uploading via a publicly accessible URL. The document will be processed according to the workspace or collection configuration, extracting structured data such as resume fields, invoice line items, or other document-specific data points.

Set **wait** to \`true\` to receive parsed results immediately, or \`false\` to get the document identifier and poll later.`,
  instructions: [
    'Either a URL or a workspace/collection must be provided.',
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
        .describe('Override file name for the uploaded document.'),
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
        .describe('If true, makes the document viewable in the Affinda validation interface.')
    })
  )
  .output(
    z.object({
      documentIdentifier: z.string().describe('Unique identifier of the uploaded document.'),
      fileName: z.string().optional().describe('Name of the processed file.'),
      state: z.string().optional().describe('Current processing state of the document.'),
      extractedData: z
        .any()
        .optional()
        .describe(
          'Structured JSON data extracted from the document (only present when wait is true).'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let workspace = ctx.input.workspaceIdentifier ?? ctx.config.workspaceIdentifier;

    ctx.info('Uploading document to Affinda...');

    let result = await client.uploadDocument({
      url: ctx.input.url,
      workspace,
      collection: ctx.input.collectionIdentifier,
      documentType: ctx.input.documentTypeIdentifier,
      wait: ctx.input.wait,
      identifier: ctx.input.identifier,
      customIdentifier: ctx.input.customIdentifier,
      fileName: ctx.input.fileName,
      language: ctx.input.language,
      rejectDuplicates: ctx.input.rejectDuplicates,
      lowPriority: ctx.input.lowPriority,
      compact: ctx.input.compact,
      deleteAfterParse: ctx.input.deleteAfterParse,
      enableValidationTool: ctx.input.enableValidationTool
    });

    return {
      output: {
        documentIdentifier: result.meta?.identifier ?? result.identifier ?? '',
        fileName: result.meta?.fileName ?? result.fileName,
        state: result.meta?.state ?? result.state,
        extractedData: result.data
      },
      message: ctx.input.wait
        ? `Document **${result.meta?.fileName ?? result.fileName ?? 'uploaded'}** has been parsed successfully.`
        : `Document uploaded and processing has started. Document identifier: \`${result.meta?.identifier ?? result.identifier}\``
    };
  })
  .build();
