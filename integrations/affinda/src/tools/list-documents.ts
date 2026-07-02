import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List and search documents in Affinda. Filter by workspace, collection, processing state, tags, or search by filename. Supports pagination and sorting. Use this to browse uploaded documents or find specific ones.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceIdentifier: z
        .string()
        .optional()
        .describe(
          'Filter by workspace identifier. Falls back to the configured default workspace.'
        ),
      collectionIdentifier: z.string().optional().describe('Filter by collection identifier.'),
      state: z
        .string()
        .optional()
        .describe(
          'Filter by document state (e.g., "uploaded", "parsed", "validated", "rejected").'
        ),
      search: z.string().optional().describe('Search by filename or tag name.'),
      inReview: z.boolean().optional().describe('Filter for documents currently in review.'),
      failed: z.boolean().optional().describe('Filter for documents that failed parsing.'),
      ready: z.boolean().optional().describe('Filter for documents that are ready.'),
      customIdentifier: z.string().optional().describe('Filter by custom identifier.'),
      offset: z.number().optional().describe('Pagination offset (number of items to skip).'),
      limit: z.number().optional().describe('Maximum number of documents to return.'),
      ordering: z
        .string()
        .optional()
        .describe('Sort field (e.g., "created_dt", "-created_dt", "file_name").'),
      includeData: z
        .boolean()
        .optional()
        .describe('If true, includes a summary of parsed data for each document.'),
      compact: z
        .boolean()
        .optional()
        .describe('If true, returns compact document representations.')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of documents matching the filters.'),
      documents: z
        .array(
          z.object({
            documentIdentifier: z.string().describe('Unique identifier of the document.'),
            fileName: z.string().optional().describe('Name of the file.'),
            state: z.string().optional().describe('Current processing state.'),
            ready: z
              .boolean()
              .optional()
              .describe('Whether the document has finished processing.'),
            failed: z.boolean().optional().describe('Whether parsing has failed.'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp.'),
            extractedData: z
              .any()
              .optional()
              .describe('Summary of parsed data (when includeData is true).')
          })
        )
        .describe('List of documents.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let workspace = ctx.input.workspaceIdentifier ?? ctx.config.workspaceIdentifier;

    let result = await client.listDocuments({
      workspace,
      collection: ctx.input.collectionIdentifier,
      state: ctx.input.state,
      search: ctx.input.search,
      inReview: ctx.input.inReview,
      failed: ctx.input.failed,
      ready: ctx.input.ready,
      customIdentifier: ctx.input.customIdentifier,
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      ordering: ctx.input.ordering,
      includeData: ctx.input.includeData,
      compact: ctx.input.compact
    });

    let results = result.results ?? result;
    let documents = (Array.isArray(results) ? results : []).map((doc: any) => {
      let meta = doc.meta ?? doc;
      return {
        documentIdentifier: meta.identifier ?? '',
        fileName: meta.fileName,
        state: meta.state,
        ready: meta.ready,
        failed: meta.failed,
        createdAt: meta.createdDt,
        extractedData: doc.data
      };
    });

    return {
      output: {
        count: result.count ?? documents.length,
        documents
      },
      message: `Found **${result.count ?? documents.length}** document(s).`
    };
  })
  .build();
