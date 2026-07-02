import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Retrieves a list of documents from Signaturely. Supports filtering by signing status (draft, awaiting, completed) and configurable sorting.
Use this to track document progress, find pending signatures, or review completed documents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['draft', 'awaiting', 'completed'])
        .optional()
        .describe('Filter documents by signing status'),
      orderingKey: z
        .enum(['createdAt', 'updatedAt'])
        .optional()
        .describe('Field to sort results by. Defaults to createdAt'),
      orderingDirection: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Sort direction. Defaults to DESC (newest first)'),
      limit: z.number().optional().describe('Maximum number of documents to return'),
      offset: z.number().optional().describe('Number of documents to skip for pagination')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            documentId: z.string().describe('Unique identifier of the document'),
            title: z.string().optional().describe('Title of the document'),
            status: z.string().optional().describe('Current signing status of the document'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the document was created'),
            updatedAt: z
              .string()
              .optional()
              .describe('ISO timestamp when the document was last updated')
          })
        )
        .describe('List of documents matching the filter criteria'),
      totalCount: z
        .number()
        .optional()
        .describe('Total number of documents matching the filter')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.info({ message: 'Listing documents', status: ctx.input.status });

    let result = await client.listDocuments({
      status: ctx.input.status,
      orderingKey: ctx.input.orderingKey,
      orderingDirection: ctx.input.orderingDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let items = result.items || result || [];
    let documents = (Array.isArray(items) ? items : []).map((doc: any) => ({
      documentId: doc.id?.toString() || '',
      title: doc.title || doc.name || undefined,
      status: doc.status || undefined,
      createdAt: doc.createdAt || undefined,
      updatedAt: doc.updatedAt || undefined
    }));

    return {
      output: {
        documents,
        totalCount: result.totalCount ?? result.total ?? documents.length
      },
      message: `Found **${documents.length}** document(s)${ctx.input.status ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
