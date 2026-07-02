import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { affindaServiceError } from '../lib/errors';
import { spec } from '../spec';

let documentTypeSchema = z.enum(['resumes', 'job_descriptions']);

let searchIndexSchema = z.object({
  name: z.string().describe('Search index name.'),
  documentType: documentTypeSchema.optional().describe('Indexed document type.'),
  user: z.any().optional().describe('Affinda user metadata returned for the index.')
});

let indexedDocumentSchema = z.object({
  documentIdentifier: z.string().describe('Indexed Affinda document identifier.')
});

let mapIndex = (index: any) => ({
  name: index.name,
  documentType: index.docType,
  user: index.user
});

let mapIndexedDocument = (document: any) => ({
  documentIdentifier: document.document ?? document.identifier ?? document
});

let requireIndexName = (indexName: string | undefined, action: string) => {
  if (!indexName) {
    throw affindaServiceError(`indexName is required for "${action}".`);
  }

  return indexName;
};

let requireDocumentIdentifier = (documentIdentifier: string | undefined, action: string) => {
  if (!documentIdentifier) {
    throw affindaServiceError(`documentIdentifier is required for "${action}".`);
  }

  return documentIdentifier;
};

export let manageSearchIndexes = SlateTool.create(spec, {
  name: 'Manage Search Indexes',
  key: 'manage_search_indexes',
  description: `List and manage Affinda Search & Match indexes and indexed documents. Use indexes to make parsed resumes or job descriptions searchable before calling Search & Match tools.`,
  instructions: [
    'For "list", optional filters are documentType, indexName, offset, and limit.',
    'For "create", provide indexName and documentType.',
    'For "update", provide indexName and newIndexName.',
    'For "delete" and "list_documents", provide indexName.',
    'For "add_document", "delete_document", or "reindex_document", provide indexName and documentIdentifier.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'create',
          'update',
          'delete',
          'list_documents',
          'add_document',
          'delete_document',
          'reindex_document'
        ])
        .describe('Search index operation to perform.'),
      indexName: z
        .string()
        .optional()
        .describe('Index name. Required for every action except list.'),
      newIndexName: z.string().optional().describe('New index name for update.'),
      documentType: documentTypeSchema
        .optional()
        .describe('Index document type for create or list filtering.'),
      documentIdentifier: z
        .string()
        .optional()
        .describe('Document identifier for add/delete/reindex document actions.'),
      offset: z.number().optional().describe('Pagination offset for list actions.'),
      limit: z.number().optional().describe('Maximum number of results to return.')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Operation that was performed.'),
      index: searchIndexSchema.optional().describe('Index returned by create/update.'),
      indexes: z.array(searchIndexSchema).optional().describe('Indexes returned by list.'),
      documents: z
        .array(indexedDocumentSchema)
        .optional()
        .describe('Documents returned by list_documents.'),
      count: z.number().optional().describe('Number of returned items.'),
      documentIdentifier: z.string().optional().describe('Indexed document identifier.'),
      deleted: z.boolean().optional().describe('Whether an item was deleted.'),
      reindexed: z.boolean().optional().describe('Whether a document was re-indexed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    if (ctx.input.action === 'list') {
      let result = await client.listIndexes({
        documentType: ctx.input.documentType,
        name: ctx.input.indexName,
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
      let indexes = (Array.isArray(result) ? result : (result.results ?? [])).map(mapIndex);

      return {
        output: {
          action: ctx.input.action,
          indexes,
          count: result.count ?? indexes.length
        },
        message: `Found **${result.count ?? indexes.length}** search index(es).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.documentType) {
        throw affindaServiceError('documentType is required for "create".');
      }

      let result = await client.createIndex({
        name: requireIndexName(ctx.input.indexName, ctx.input.action),
        docType: ctx.input.documentType
      });

      return {
        output: {
          action: ctx.input.action,
          index: mapIndex(result)
        },
        message: `Created search index **${result.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let indexName = requireIndexName(ctx.input.indexName, ctx.input.action);
      if (!ctx.input.newIndexName) {
        throw affindaServiceError('newIndexName is required for "update".');
      }

      let result = await client.updateIndex(indexName, { name: ctx.input.newIndexName });

      return {
        output: {
          action: ctx.input.action,
          index: mapIndex(result)
        },
        message: `Updated search index **${indexName}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let indexName = requireIndexName(ctx.input.indexName, ctx.input.action);
      await client.deleteIndex(indexName);

      return {
        output: {
          action: ctx.input.action,
          deleted: true
        },
        message: `Deleted search index **${indexName}**.`
      };
    }

    if (ctx.input.action === 'list_documents') {
      let indexName = requireIndexName(ctx.input.indexName, ctx.input.action);
      let result = await client.listIndexedDocuments(indexName, {
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
      let documents = (Array.isArray(result) ? result : (result.results ?? [])).map(
        mapIndexedDocument
      );

      return {
        output: {
          action: ctx.input.action,
          documents,
          count: result.count ?? documents.length
        },
        message: `Found **${result.count ?? documents.length}** indexed document(s).`
      };
    }

    let indexName = requireIndexName(ctx.input.indexName, ctx.input.action);
    let documentIdentifier = requireDocumentIdentifier(
      ctx.input.documentIdentifier,
      ctx.input.action
    );

    if (ctx.input.action === 'add_document') {
      let result = await client.indexDocument(indexName, documentIdentifier);

      return {
        output: {
          action: ctx.input.action,
          documentIdentifier: result.document ?? documentIdentifier
        },
        message: `Indexed document \`${documentIdentifier}\` in **${indexName}**.`
      };
    }

    if (ctx.input.action === 'delete_document') {
      await client.deleteIndexedDocument(indexName, documentIdentifier);

      return {
        output: {
          action: ctx.input.action,
          deleted: true,
          documentIdentifier
        },
        message: `Deleted indexed document \`${documentIdentifier}\` from **${indexName}**.`
      };
    }

    await client.reindexDocument(indexName, documentIdentifier);

    return {
      output: {
        action: ctx.input.action,
        reindexed: true,
        documentIdentifier
      },
      message: `Re-indexed document \`${documentIdentifier}\` in **${indexName}**.`
    };
  })
  .build();
