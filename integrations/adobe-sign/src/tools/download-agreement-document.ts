import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let toBase64AttachmentContent = (data: unknown) => {
  if (typeof data === 'string') {
    let buffer = Buffer.from(data, 'binary');
    return { base64: buffer.toString('base64'), byteLength: buffer.byteLength };
  }

  if (data instanceof ArrayBuffer) {
    let buffer = Buffer.from(data);
    return { base64: buffer.toString('base64'), byteLength: buffer.byteLength };
  }

  if (ArrayBuffer.isView(data)) {
    let buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    return { base64: buffer.toString('base64'), byteLength: buffer.byteLength };
  }

  let buffer = Buffer.from(JSON.stringify(data), 'utf8');
  return { base64: buffer.toString('base64'), byteLength: buffer.byteLength };
};

export let downloadAgreementDocument = SlateTool.create(spec, {
  name: 'Download Agreement Document',
  key: 'download_agreement_document',
  description: `List or download documents attached to an Adobe Acrobat Sign agreement. Downloads return the file through a Slate attachment; use documentId "combined" or omit documentId to download one combined PDF.`,
  instructions: [
    'Set listOnly to true to inspect available document IDs before downloading.',
    'Omit documentId, or set it to "combined", to download the combined agreement PDF.',
    'Use a specific documentId from listOnly output to download one agreement document.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agreementId: z.string().describe('ID of the agreement containing the document'),
      documentId: z
        .string()
        .optional()
        .describe('Document ID to download. Use "combined" or omit for the combined PDF.'),
      listOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, only list available documents without downloading content')
    })
  )
  .output(
    z.object({
      agreementId: z.string().describe('ID of the agreement'),
      documents: z
        .array(
          z.object({
            documentId: z.string().describe('ID of the document'),
            label: z.string().optional().describe('Document label or name'),
            createdDate: z.string().optional().describe('Document creation date'),
            numPages: z.number().optional().describe('Number of pages')
          })
        )
        .describe('Available agreement documents'),
      documentId: z.string().optional().describe('Downloaded document ID or "combined"'),
      documentName: z.string().optional().describe('Best-effort display name'),
      mimeType: z.string().optional().describe('MIME type of the attachment'),
      byteLength: z.number().optional().describe('Attachment size in bytes'),
      attachmentCount: z.number().optional().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let documentList = await client.getAgreementDocuments(ctx.input.agreementId);
    let documents = (documentList.documents || []).map((document: any) => ({
      documentId: document.id,
      label: document.label,
      createdDate: document.createdDate,
      numPages: document.numPages
    }));

    if (ctx.input.listOnly) {
      return {
        output: {
          agreementId: ctx.input.agreementId,
          documents
        },
        message: `Agreement \`${ctx.input.agreementId}\` has **${documents.length}** document(s).`
      };
    }

    let targetDocumentId = ctx.input.documentId || 'combined';
    let data =
      targetDocumentId === 'combined'
        ? await client.getAgreementCombinedDocument(ctx.input.agreementId)
        : await client.downloadAgreementDocument(ctx.input.agreementId, targetDocumentId);
    let attachment = toBase64AttachmentContent(data);
    let targetDocument = documents.find(
      (document: { documentId: string }) => document.documentId === targetDocumentId
    );
    let documentName =
      targetDocumentId === 'combined'
        ? 'Combined Agreement Document'
        : targetDocument?.label || `Document ${targetDocumentId}`;

    return {
      output: {
        agreementId: ctx.input.agreementId,
        documents,
        documentId: targetDocumentId,
        documentName,
        mimeType: 'application/pdf',
        byteLength: attachment.byteLength,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(attachment.base64, 'application/pdf')],
      message: `Downloaded **${documentName}** for agreement \`${ctx.input.agreementId}\`.`
    };
  });
