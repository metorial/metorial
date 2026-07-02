import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `List documents in Ragie with optional metadata filtering and pagination. Returns documents sorted by creation date (newest first).
Use this to browse your knowledge base, find documents by metadata, or paginate through all indexed content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to fetch the next page'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of documents per page (1-100, default 10)'),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Metadata filter object using comparison operators like $eq, $in, $gt, etc.'
        ),
      partition: z
        .string()
        .optional()
        .describe('Partition to scope the query to. Overrides default partition from config.')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            documentId: z.string().describe('Unique document ID'),
            name: z.string().describe('Document name'),
            status: z.string().describe('Processing status'),
            metadata: z.record(z.string(), z.any()).describe('Document metadata'),
            partition: z.string().nullable().describe('Document partition'),
            chunkCount: z.number().nullable().describe('Number of chunks'),
            externalId: z.string().nullable().describe('External reference ID'),
            createdAt: z.string().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().describe('ISO 8601 last update timestamp')
          })
        )
        .describe('List of documents'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for the next page, null if no more pages'),
      totalCount: z.number().describe('Total number of documents matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    let result = await client.listDocuments({
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      filter: ctx.input.filter,
      partition: ctx.input.partition
    });

    let documents = result.documents.map(d => ({
      documentId: d.id,
      name: d.name,
      status: d.status,
      metadata: d.metadata,
      partition: d.partition,
      chunkCount: d.chunkCount,
      externalId: d.externalId,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));

    return {
      output: {
        documents,
        nextCursor: result.pagination.nextCursor,
        totalCount: result.pagination.totalCount
      },
      message: `Found **${result.pagination.totalCount}** documents. Returned **${documents.length}** in this page.${result.pagination.nextCursor ? ' More pages available.' : ''}`
    };
  })
  .build();
