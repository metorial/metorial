import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { FirestoreClient } from '../lib/client';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let queryFirestore = SlateTool.create(spec, {
  name: 'Query Firestore',
  key: 'query_firestore',
  description: `Query or list documents from a Cloud Firestore collection. Supports structured queries with field filters, ordering, and pagination. Use the simple list mode for browsing documents or the query mode for filtered searches.`,
  instructions: [
    'For simple listing, just provide collectionPath. Use pageToken for pagination.',
    'For filtered queries, provide filters with field paths, operators, and values.',
    'Supported filter operators: EQUAL, NOT_EQUAL, LESS_THAN, LESS_THAN_OR_EQUAL, GREATER_THAN, GREATER_THAN_OR_EQUAL, ARRAY_CONTAINS, IN, ARRAY_CONTAINS_ANY, NOT_IN.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(firebaseActionScopes.queryFirestore)
  .input(
    z.object({
      collectionPath: z
        .string()
        .describe('Path to the collection, e.g. "users" or "projects/abc/tasks"'),
      filters: z
        .array(
          z.object({
            field: z.string().describe('Field path to filter on'),
            op: z
              .enum([
                'EQUAL',
                'NOT_EQUAL',
                'LESS_THAN',
                'LESS_THAN_OR_EQUAL',
                'GREATER_THAN',
                'GREATER_THAN_OR_EQUAL',
                'ARRAY_CONTAINS',
                'IN',
                'ARRAY_CONTAINS_ANY',
                'NOT_IN'
              ])
              .describe('Filter operator'),
            value: z.any().describe('Value to filter against')
          })
        )
        .optional()
        .describe('Query filters. If omitted, lists all documents.'),
      orderBy: z
        .array(
          z.object({
            field: z.string().describe('Field path to order by'),
            direction: z
              .enum(['ASCENDING', 'DESCENDING'])
              .optional()
              .describe('Sort direction. Defaults to ASCENDING.')
          })
        )
        .optional()
        .describe('Ordering for results'),
      limit: z.number().optional().describe('Maximum number of documents to return'),
      pageSize: z
        .number()
        .optional()
        .describe('Page size for listing (without filters). Defaults to 20.'),
      pageToken: z.string().optional().describe('Page token for listing continuation'),
      databaseId: z
        .string()
        .optional()
        .describe('Firestore database ID. Defaults to "(default)".')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            documentPath: z.string().describe('Full resource path of the document'),
            documentId: z.string().describe('The document ID'),
            fields: z.record(z.string(), z.any()).describe('Decoded document fields'),
            createTime: z.string().describe('Document creation timestamp'),
            updateTime: z.string().describe('Document last update timestamp')
          })
        )
        .describe('Matching documents'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for fetching the next page (list mode only)'),
      totalReturned: z.number().describe('Number of documents returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirestoreClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      databaseId: ctx.input.databaseId
    });

    let { collectionPath, filters, orderBy, limit, pageSize, pageToken } = ctx.input;

    if (filters && filters.length > 0) {
      let documents = await client.queryDocuments(collectionPath, {
        where: filters.map(f => ({
          field: f.field,
          op: f.op,
          value: f.value
        })),
        orderBy: orderBy?.map(o => ({
          field: o.field,
          direction: o.direction
        })),
        limit
      });

      return {
        output: {
          documents,
          totalReturned: documents.length
        },
        message: `Found **${documents.length}** document(s) in \`${collectionPath}\` matching the query.`
      };
    }

    let result = await client.listDocuments(collectionPath, {
      pageSize: pageSize || limit,
      pageToken,
      orderBy: orderBy?.[0]
        ? `${orderBy[0].field} ${(orderBy[0].direction || 'ASCENDING').toLowerCase()}`
        : undefined
    });

    return {
      output: {
        documents: result.documents,
        nextPageToken: result.nextPageToken,
        totalReturned: result.documents.length
      },
      message: `Listed **${result.documents.length}** document(s) from \`${collectionPath}\`.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
