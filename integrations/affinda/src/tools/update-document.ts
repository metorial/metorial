import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { affindaServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateDocument = SlateTool.create(spec, {
  name: 'Update Document',
  key: 'update_document',
  description: `Update Affinda document metadata and lifecycle state. Use this to rename a document, move it to another workspace or collection, update custom identifiers, set an expiry time, archive, confirm, reject, or skip parsing.`,
  instructions: [
    'Provide at least one field to update.',
    'Use delete_document only when the document should be permanently removed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      documentIdentifier: z.string().describe('Identifier of the document to update.'),
      workspaceIdentifier: z
        .string()
        .optional()
        .describe('Move the document to this workspace.'),
      collectionIdentifier: z
        .string()
        .optional()
        .describe('Move the document to this collection.'),
      documentTypeIdentifier: z
        .string()
        .optional()
        .describe('Set the document type identifier.'),
      fileName: z.string().optional().describe('New document file name.'),
      expiryTime: z
        .string()
        .optional()
        .describe('ISO-8601 date-time when Affinda should automatically delete the document.'),
      isConfirmed: z.boolean().optional().describe('Mark the document as confirmed.'),
      isRejected: z.boolean().optional().describe('Mark the document as rejected.'),
      isArchived: z.boolean().optional().describe('Mark the document as archived.'),
      skipParse: z.boolean().optional().describe('Skip parsing for this document.'),
      language: z.string().optional().describe('Language code in ISO 639-1 format.'),
      identifier: z
        .string()
        .optional()
        .describe('Deprecated Affinda identifier override. Prefer customIdentifier.'),
      customIdentifier: z
        .string()
        .optional()
        .describe('Custom identifier for external reference.'),
      llmHint: z
        .string()
        .optional()
        .describe(
          'Optional hint inserted into the LLM prompt while processing this document.'
        ),
      compact: z
        .boolean()
        .optional()
        .describe('If true, returns compact parsed data in the response.')
    })
  )
  .output(
    z.object({
      documentIdentifier: z.string().describe('Identifier of the updated document.'),
      fileName: z.string().optional().describe('Updated file name.'),
      state: z.string().optional().describe('Current processing state.'),
      customIdentifier: z.string().optional().describe('Custom identifier.'),
      ready: z.boolean().optional().describe('Whether the document has finished processing.'),
      failed: z.boolean().optional().describe('Whether parsing has failed.'),
      isConfirmed: z.boolean().optional().describe('Whether the document is confirmed.'),
      isRejected: z.boolean().optional().describe('Whether the document is rejected.'),
      isArchived: z.boolean().optional().describe('Whether the document is archived.'),
      workspaceIdentifier: z.string().optional().describe('Workspace identifier.'),
      collectionIdentifier: z.string().optional().describe('Collection identifier.'),
      documentTypeIdentifier: z.string().optional().describe('Document type identifier.'),
      extractedData: z.any().optional().describe('Updated parsed data, when returned.')
    })
  )
  .handleInvocation(async ctx => {
    let data: Record<string, any> = {};

    if (ctx.input.workspaceIdentifier) data.workspace = ctx.input.workspaceIdentifier;
    if (ctx.input.collectionIdentifier) data.collection = ctx.input.collectionIdentifier;
    if (ctx.input.documentTypeIdentifier) data.documentType = ctx.input.documentTypeIdentifier;
    if (ctx.input.fileName) data.fileName = ctx.input.fileName;
    if (ctx.input.expiryTime) data.expiryTime = ctx.input.expiryTime;
    if (ctx.input.isConfirmed !== undefined) data.isConfirmed = ctx.input.isConfirmed;
    if (ctx.input.isRejected !== undefined) data.isRejected = ctx.input.isRejected;
    if (ctx.input.isArchived !== undefined) data.isArchived = ctx.input.isArchived;
    if (ctx.input.skipParse !== undefined) data.skipParse = ctx.input.skipParse;
    if (ctx.input.language) data.language = ctx.input.language;
    if (ctx.input.identifier) data.identifier = ctx.input.identifier;
    if (ctx.input.customIdentifier) data.customIdentifier = ctx.input.customIdentifier;
    if (ctx.input.llmHint) data.llmHint = ctx.input.llmHint;

    if (Object.keys(data).length === 0) {
      throw affindaServiceError('Provide at least one document field to update.');
    }

    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.updateDocument(ctx.input.documentIdentifier, data, {
      compact: ctx.input.compact
    });
    let meta = result.meta ?? result;

    return {
      output: {
        documentIdentifier: meta.identifier ?? ctx.input.documentIdentifier,
        fileName: meta.fileName,
        state: meta.state,
        customIdentifier: meta.customIdentifier,
        ready: meta.ready,
        failed: meta.failed,
        isConfirmed: meta.isConfirmed,
        isRejected: meta.isRejected,
        isArchived: meta.isArchived,
        workspaceIdentifier: meta.workspace?.identifier,
        collectionIdentifier: meta.collection?.identifier,
        documentTypeIdentifier: meta.documentType,
        extractedData: result.data
      },
      message: `Updated document \`${meta.identifier ?? ctx.input.documentIdentifier}\`.`
    };
  })
  .build();
