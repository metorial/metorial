import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let getDocumentStatus = SlateTool.create(spec, {
  name: 'Get Document Status',
  key: 'get_document_status',
  description: `Retrieve lightweight PandaDoc document status and lifecycle timestamps. Use this to poll newly created documents until they reach draft status before sending or updating.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to check')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document UUID'),
      documentName: z.string().optional().describe('Document name'),
      status: z.string().describe('Current document status'),
      dateCreated: z.string().optional().describe('ISO 8601 creation timestamp'),
      dateModified: z.string().optional().describe('ISO 8601 last modified timestamp'),
      dateCompleted: z
        .string()
        .optional()
        .describe('ISO 8601 completion timestamp, when available'),
      expirationDate: z.string().nullable().optional().describe('ISO 8601 expiration date'),
      version: z.string().optional().describe('Document version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let document = await client.getDocumentStatus(ctx.input.documentId);

    return {
      output: {
        documentId: document.id || ctx.input.documentId,
        documentName: document.name,
        status: document.status,
        dateCreated: document.date_created,
        dateModified: document.date_modified,
        dateCompleted: document.date_completed || undefined,
        expirationDate: document.expiration_date || null,
        version: document.version
      },
      message: `Document \`${document.id || ctx.input.documentId}\` status is \`${document.status}\`.`
    };
  })
  .build();
