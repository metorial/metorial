import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List all documents stored in a specific DocSet. Returns document metadata including IDs and properties. Supports pagination for large collections.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet to list documents from'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      documents: z.array(z.any()).describe('List of documents with metadata'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listDocuments(ctx.input.docsetId, {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let documents = result?.documents ?? (Array.isArray(result) ? result : []);

    return {
      output: {
        documents,
        nextPageToken: result?.next_page_token
      },
      message: `Found **${documents.length}** document(s) in the DocSet.`
    };
  })
  .build();

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a parsed document from a DocSet, including its metadata and optionally its parsed elements (chunks). Use this to inspect the structured content of a previously parsed document.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet containing the document'),
      documentId: z.string().describe('ID of the document to retrieve'),
      includeElements: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to include parsed elements in the response')
    })
  )
  .output(
    z.object({
      document: z.any().describe('Document metadata and content')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getDocument(ctx.input.docsetId, ctx.input.documentId, {
      includeElements: ctx.input.includeElements
    });

    return {
      output: { document: result },
      message: `Retrieved document \`${ctx.input.documentId}\` from DocSet.`
    };
  })
  .build();

export let deleteDocument = SlateTool.create(spec, {
  name: 'Delete Document',
  key: 'delete_document',
  description: `Delete a document from a DocSet. This removes the document and all its parsed data permanently.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet containing the document'),
      documentId: z.string().describe('ID of the document to delete')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Deletion confirmation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.deleteDocument(ctx.input.docsetId, ctx.input.documentId);

    return {
      output: { result },
      message: `Deleted document \`${ctx.input.documentId}\` from DocSet.`
    };
  })
  .build();

export let updateDocumentProperties = SlateTool.create(spec, {
  name: 'Update Document Properties',
  key: 'update_document_properties',
  description: `Update metadata properties on a specific document using JSON Patch operations. Supports adding, replacing, and removing property values.`,
  instructions: [
    'Use op "add" or "replace" to set property values, and "remove" to delete them.',
    'The path should reference the property name, e.g. "/properties/my_property".'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      docsetId: z.string().describe('ID of the DocSet containing the document'),
      documentId: z.string().describe('ID of the document to update'),
      operations: z
        .array(
          z.object({
            op: z.enum(['add', 'replace', 'remove']).describe('Patch operation type'),
            path: z.string().describe('JSON Patch path, e.g. "/properties/my_property"'),
            value: z.any().optional().describe('Value to set (required for add/replace)')
          })
        )
        .describe('JSON Patch operations to apply')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Updated document data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.updateDocumentProperties(
      ctx.input.docsetId,
      ctx.input.documentId,
      ctx.input.operations
    );

    return {
      output: { result },
      message: `Applied **${ctx.input.operations.length}** property update(s) to document \`${ctx.input.documentId}\`.`
    };
  })
  .build();
