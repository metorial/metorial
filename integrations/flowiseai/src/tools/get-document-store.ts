import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let getDocumentStore = SlateTool.create(spec, {
  name: 'Get Document Store',
  key: 'get_document_store',
  description: `Retrieve detailed information about a specific document store including its configuration, loaders, status, and vector store settings.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      storeId: z.string().describe('ID of the document store to retrieve')
    })
  )
  .output(
    z.object({
      storeId: z.string().describe('Unique identifier of the document store'),
      name: z.string().describe('Name of the document store'),
      description: z.string().optional().nullable().describe('Description'),
      status: z.string().optional().describe('Current status'),
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
      vectorStoreConfig: z
        .string()
        .optional()
        .nullable()
        .describe('Vector store configuration JSON'),
      embeddingConfig: z
        .string()
        .optional()
        .nullable()
        .describe('Embedding model configuration JSON'),
      recordManagerConfig: z
        .string()
        .optional()
        .nullable()
        .describe('Record manager configuration JSON'),
      createdDate: z.string().optional().describe('ISO 8601 creation date'),
      updatedDate: z.string().optional().describe('ISO 8601 last update date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let s = await client.getDocumentStore(ctx.input.storeId);

    return {
      output: {
        storeId: s.id,
        name: s.name,
        description: s.description,
        status: s.status,
        loaders: s.loaders,
        whereUsed: s.whereUsed,
        vectorStoreConfig: s.vectorStoreConfig,
        embeddingConfig: s.embeddingConfig,
        recordManagerConfig: s.recordManagerConfig,
        createdDate: s.createdDate,
        updatedDate: s.updatedDate
      },
      message: `Retrieved document store **${s.name}** (\`${s.id}\`) with status: ${s.status}.`
    };
  })
  .build();
