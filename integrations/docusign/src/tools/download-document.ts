import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description: `Downloads a document from a DocuSign envelope as an attachment. Can download individual documents by ID, all documents combined, or list available documents in the envelope.`,
  instructions: [
    'Use documentId "combined" to download all documents merged into a single PDF.',
    'Use documentId "certificate" to download the certificate of completion.',
    'Use the listOnly option to see available documents before downloading.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope containing the document'),
      documentId: z
        .string()
        .optional()
        .describe(
          'ID of the specific document to download. Use "combined" for all documents, "certificate" for the certificate of completion.'
        ),
      listOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, only lists available documents without downloading')
    })
  )
  .output(
    z.object({
      documents: z
        .array(
          z.object({
            documentId: z.string(),
            name: z.string(),
            order: z.string().optional(),
            pages: z.string().optional()
          })
        )
        .optional()
        .describe('List of available documents in the envelope'),
      documentId: z.string().optional().describe('ID of the downloaded document'),
      documentName: z.string().optional().describe('Name of the downloaded document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let docList = await client.listDocuments(ctx.input.envelopeId);
    let documents = (docList.envelopeDocuments || []).map((doc: any) => ({
      documentId: doc.documentId,
      name: doc.name,
      order: doc.order,
      pages: doc.pages
    }));

    if (ctx.input.listOnly) {
      return {
        output: { documents },
        message: `Envelope contains **${documents.length}** document(s): ${documents.map((d: any) => d.name).join(', ')}`
      };
    }

    let targetId = ctx.input.documentId || 'combined';
    let documentBase64 = await client.getDocument(ctx.input.envelopeId, targetId);

    let targetDoc = documents.find((d: any) => d.documentId === targetId);
    let docName =
      targetDoc?.name ||
      (targetId === 'combined'
        ? 'Combined Documents'
        : targetId === 'certificate'
          ? 'Certificate of Completion'
          : `Document ${targetId}`);

    return {
      output: {
        documents,
        documentId: targetId,
        documentName: docName
      },
      attachments: [createBase64Attachment(documentBase64, 'application/pdf')],
      message: `Downloaded document "**${docName}**" from envelope ${ctx.input.envelopeId}.`
    };
  })
  .build();
