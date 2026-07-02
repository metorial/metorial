import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentSummarySchema = z.object({
  documentId: z.string().describe('ID of the document'),
  documentName: z.string().describe('Name of the document'),
  status: z.string().describe('Current status of the document'),
  createdAt: z.string().describe('Timestamp when the document was created'),
  updatedAt: z.string().describe('Timestamp when the document was last updated')
});

export let listDocuments = SlateTool.create(spec, {
  name: 'List Documents',
  key: 'list_documents',
  description: `Lists documents in your Docnify account. Returns a summary of each document including its ID, name, status, and timestamps. Supports pagination through limit and offset parameters.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of documents to return (default varies by API)'),
      offset: z.number().optional().describe('Number of documents to skip for pagination')
    })
  )
  .output(
    z.object({
      documents: z.array(documentSummarySchema).describe('List of documents'),
      count: z.number().describe('Number of documents returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let documents = await client.listDocuments({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mappedDocuments = documents.map(doc => ({
      documentId: doc.id,
      documentName: doc.name,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }));

    return {
      output: {
        documents: mappedDocuments,
        count: mappedDocuments.length
      },
      message: `Found **${mappedDocuments.length}** documents.`
    };
  })
  .build();
