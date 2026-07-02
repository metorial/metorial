import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a specific document by its ID, including its parsed data as JSON. Use this to inspect a document's extraction results and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the document to retrieve')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Unique identifier of the document'),
      name: z.string().optional().describe('Document name or subject'),
      status: z.string().optional().describe('Current status of the document'),
      createdAt: z.string().optional().describe('Document creation timestamp'),
      mailboxId: z.string().optional().describe('ID of the parent mailbox'),
      parsedData: z
        .any()
        .optional()
        .describe('Structured parsed data extracted from the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let doc = await client.getDocument(ctx.input.documentId);

    return {
      output: {
        documentId: doc._id || doc.id,
        name: doc.name || doc.subject,
        status: doc.status,
        createdAt: doc.created_at || doc.createdAt,
        mailboxId: doc.mailbox_id || doc.mailboxId || doc.mb,
        parsedData: doc.parsed || doc.data
      },
      message: `Retrieved document **${doc.name || doc._id || doc.id}** (status: ${doc.status || 'unknown'}).`
    };
  })
  .build();
