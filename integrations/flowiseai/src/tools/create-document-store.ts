import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let createDocumentStore = SlateTool.create(spec, {
  name: 'Create Document Store',
  key: 'create_document_store',
  description: `Create a new document store for retrieval-augmented generation (RAG). Document stores hold ingested and chunked documents for vector search.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new document store'),
      description: z.string().optional().describe('Description of the document store')
    })
  )
  .output(
    z.object({
      storeId: z.string().describe('ID of the newly created document store'),
      name: z.string().describe('Name of the created store'),
      description: z.string().optional().nullable().describe('Description'),
      status: z.string().optional().describe('Initial status'),
      createdDate: z.string().optional().describe('ISO 8601 creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.createDocumentStore(ctx.input);

    return {
      output: {
        storeId: result.id,
        name: result.name,
        description: result.description,
        status: result.status,
        createdDate: result.createdDate
      },
      message: `Created document store **${result.name}** (\`${result.id}\`).`
    };
  })
  .build();
