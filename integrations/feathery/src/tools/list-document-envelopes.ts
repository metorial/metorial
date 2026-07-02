import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let listDocumentEnvelopes = SlateTool.create(spec, {
  name: 'List Document Envelopes',
  key: 'list_document_envelopes',
  description: `List generated document envelopes (filled documents). Filter by document template ID or user ID to track document view/sign status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filterType: z
        .enum(['document', 'user'])
        .describe('Filter envelopes by document template or user'),
      filterId: z.string().describe('The document template ID or user ID to filter by')
    })
  )
  .output(
    z.object({
      envelopes: z
        .array(
          z.object({
            envelopeId: z.string().describe('Unique envelope identifier'),
            documentId: z.string().optional().describe('Source document template ID'),
            userId: z.string().optional().describe('Associated user ID'),
            signerEmail: z.string().optional().describe('Signer email address'),
            senderEmail: z.string().optional().describe('Sender email address'),
            fileUrl: z.string().optional().describe('URL to the generated document file'),
            documentType: z.string().optional().describe('Document type (pdf, docx, xlsx)'),
            viewed: z.boolean().optional().describe('Whether the document has been viewed'),
            signed: z.boolean().optional().describe('Whether the document has been signed'),
            tags: z.array(z.string()).optional().describe('Tags on the envelope'),
            createdAt: z.string().optional().describe('When the envelope was created')
          })
        )
        .describe('List of document envelopes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let envelopes = await client.listDocumentEnvelopes({
      type: ctx.input.filterType,
      id: ctx.input.filterId
    });

    let mapped = envelopes.map((e: any) => ({
      envelopeId: e.id,
      documentId: e.document,
      userId: e.user,
      signerEmail: e.signer,
      senderEmail: e.sender,
      fileUrl: e.file_url || e.file,
      documentType: e.type,
      viewed: e.viewed,
      signed: e.signed,
      tags: e.tags,
      createdAt: e.created_at
    }));

    return {
      output: { envelopes: mapped },
      message: `Found **${mapped.length}** document envelope(s).`
    };
  })
  .build();
