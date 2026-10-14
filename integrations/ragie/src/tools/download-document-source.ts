import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadDocumentSource = SlateTool.create(spec, {
  name: 'Download Document Source',
  key: 'download_document_source',
  description:
    'Prepare the original source file of a document for download. URL-ingested documents return the downloaded source, and connector documents return the source representation supported by that connector.',
  tags: { readOnly: true },
  instructions: ['Call list_documents to discover document IDs.']
})
  .input(
    z.object({
      documentId: z.string().describe('Document ID from list_documents or create_document'),
      partition: z.string().optional().describe('Partition override')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      name: z.string(),
      partition: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let partition = ctx.input.partition ?? ctx.config.partition;
    let client = new Client({ token: ctx.auth.token, partition });
    let document = await client.getDocument(ctx.input.documentId);
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.ragie.ai/documents/${encodeURIComponent(document.id)}/source`,
      headers: {
        Authorization: `Bearer ${ctx.auth.token}`,
        ...(partition ? { partition } : {})
      }
    });
    return {
      output: { documentId: document.id, name: document.name, partition: document.partition },
      message: `Prepared the source of **${document.name}** for download.`
    };
  })
  .build();
