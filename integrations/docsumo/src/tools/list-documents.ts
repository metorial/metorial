import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentSchema = z.object({
  docId: z.string().describe('Unique document identifier'),
  title: z.string().describe('Document filename'),
  status: z.string().describe('Processing status'),
  type: z.string().describe('Document type identifier'),
  typeTitle: z.string().optional().describe('Human-readable document type name'),
  createdAtIso: z.string().optional().describe('Creation timestamp in ISO 8601 format'),
  modifiedAtIso: z.string().optional().describe('Last modified timestamp in ISO 8601 format'),
  reviewUrl: z.string().optional().describe('URL to review the document'),
  userDocId: z.string().optional().describe('User-defined document ID'),
  folderId: z.string().optional().describe('Folder ID if document is in a folder'),
  folderName: z.string().optional().describe('Folder name'),
  uploadedBy: z
    .object({
      userId: z.string(),
      email: z.string(),
      fullName: z.string()
    })
    .optional()
    .describe('User who uploaded the document')
});

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Retrieve a paginated list of documents from your Docsumo account. Supports filtering by document type, processing status, creation date, folder, and keyword search. Results can be sorted by creation date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      view: z
        .enum(['files', 'folder', 'all_files'])
        .optional()
        .describe(
          'Filter by location: "files" for unfoldered, "folder" for a specific folder, "all_files" for everything'
        ),
      folderId: z
        .string()
        .optional()
        .describe('Folder ID to filter by. Required when view is "folder".'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of documents to return (0-20, default 20)'),
      offset: z.number().optional().describe('Number of documents to skip for pagination'),
      documentType: z
        .string()
        .optional()
        .describe('Filter by document type (e.g., "invoice", "bank_statements")'),
      status: z
        .enum(['reviewing', 'processed', 'erred'])
        .optional()
        .describe('Filter by processing status'),
      query: z.string().optional().describe('Search keyword to match against document titles'),
      sortBy: z
        .enum(['created_date.asc', 'created_date.desc'])
        .optional()
        .describe('Sort order by creation date'),
      createdDateGte: z
        .string()
        .optional()
        .describe('Filter documents created on or after this date (YYYY-MM-DD)'),
      createdDateLte: z
        .string()
        .optional()
        .describe('Filter documents created on or before this date (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      documents: z.array(documentSchema).describe('List of documents'),
      total: z.number().describe('Total number of matching documents'),
      limit: z.number().describe('Maximum documents returned per request'),
      offset: z.number().describe('Number of documents skipped')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listDocuments({
      view: ctx.input.view,
      folderId: ctx.input.folderId,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      docType: ctx.input.documentType,
      status: ctx.input.status,
      query: ctx.input.query,
      sortBy: ctx.input.sortBy,
      createdDateGte: ctx.input.createdDateGte,
      createdDateLte: ctx.input.createdDateLte
    });

    return {
      output: result,
      message: `Found **${result.total}** document(s). Returned ${result.documents.length} document(s) (offset: ${result.offset}).`
    };
  })
  .build();
