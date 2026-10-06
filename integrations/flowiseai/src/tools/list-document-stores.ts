import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient, flowiseJsonString, parseFlowiseList } from '../lib/client';
import { paginationOutputShape, paginationShape } from '../lib/schemas';
import { spec } from '../spec';

export let listDocumentStores = SlateTool.create(spec, {
  name: 'List Document Stores',
  key: 'list_document_stores',
  description: `Retrieve all document stores used for retrieval-augmented generation (RAG). Returns each store's name, description, status, and configuration.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({ ...paginationShape }))
  .output(
    z.object({
      ...paginationOutputShape,
      documentStores: z
        .array(
          z.object({
            storeId: z.string().describe('Unique identifier of the document store'),
            name: z.string().describe('Name of the document store'),
            description: z
              .string()
              .optional()
              .nullable()
              .describe('Description of the document store'),
            status: z
              .string()
              .optional()
              .describe('Status: EMPTY, SYNC, SYNCING, STALE, NEW, UPSERTING, UPSERTED'),
            loaders: z
              .string()
              .optional()
              .nullable()
              .describe('JSON string of loader configurations'),
            whereUsed: z
              .string()
              .optional()
              .nullable()
              .describe('JSON string of chatflows using this store'),
            createdDate: z.string().optional().describe('ISO 8601 creation date'),
            updatedDate: z.string().optional().describe('ISO 8601 last update date')
          })
        )
        .describe('List of document stores')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listDocumentStores(ctx.input);
    let { items: stores, ...pagination } = parseFlowiseList(result, ctx.input);

    return {
      output: {
        ...pagination,
        documentStores: stores.map((s: any) => ({
          storeId: s.id,
          name: s.name,
          description: s.description,
          status: s.status,
          loaders: flowiseJsonString(s.loaders),
          whereUsed: flowiseJsonString(s.whereUsed),
          createdDate: s.createdDate,
          updatedDate: s.updatedDate
        }))
      },
      message: `Found **${stores.length}** document store(s).`
    };
  })
  .build();
