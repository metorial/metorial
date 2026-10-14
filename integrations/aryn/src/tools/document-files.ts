import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addDocument = SlateTool.create(spec, {
  name: 'Add Document',
  key: 'add_document',
  description:
    'Parse a document from a URL and store it in an existing DocSet. The DocSet schema is used to extract document properties. Call list_docsets to discover the destination.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      docsetId: z
        .string()
        .describe('Destination DocSet ID. Call list_docsets to discover DocSets.'),
      fileUrl: z.string().describe('Public HTTP or HTTPS URL of the document to add')
    })
  )
  .output(
    z.object({
      document: z.any().describe('Stored document metadata, including doc_id and docset_id')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let document = await client.addDocumentFromUrl(ctx.input.docsetId, ctx.input.fileUrl);
    return {
      output: { document },
      message: `Added document **${document.name}** (ID: \`${document.doc_id}\`) to the DocSet.`
    };
  })
  .build();

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Original Document',
  key: 'download_document',
  description:
    'Download the original source file of a stored document. Call list_docsets and list_documents to discover the DocSet and document IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      docsetId: z.string().describe('DocSet ID. Call list_docsets to discover DocSets.'),
      documentId: z
        .string()
        .describe('Document ID. Call list_documents to discover documents.')
    })
  )
  .output(
    z.object({
      docsetId: z.string().describe('DocSet containing the source file'),
      documentId: z.string().describe('Document whose original source file is downloadable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    await ctx.addAttachment({
      type: 'url',
      url: client.getDocumentBinaryUrl(ctx.input.docsetId, ctx.input.documentId),
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    return {
      output: { docsetId: ctx.input.docsetId, documentId: ctx.input.documentId },
      message: `Prepared the original file for document \`${ctx.input.documentId}\` for download.`
    };
  })
  .build();
