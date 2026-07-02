import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

let recipientOutputSchema = z.object({
  recipientId: z.string().describe('Recipient UUID'),
  email: z.string().describe('Recipient email'),
  firstName: z.string().optional().describe('Recipient first name'),
  lastName: z.string().optional().describe('Recipient last name'),
  recipientType: z.string().optional().describe('Recipient type (signer, approver, cc)'),
  hasCompleted: z
    .boolean()
    .optional()
    .describe('Whether the recipient has completed their actions'),
  signingOrder: z.number().optional().describe('Signing order'),
  sharedLink: z.string().optional().describe('Shared document link for this recipient')
});

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve full details of a PandaDoc document including its status, recipients, fields, tokens, metadata, tags, pricing, and linked objects. Use this to inspect any aspect of a document.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document to retrieve')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document UUID'),
      documentName: z.string().describe('Document name'),
      status: z.string().describe('Current document status'),
      dateCreated: z.string().describe('ISO 8601 creation timestamp'),
      dateModified: z.string().describe('ISO 8601 last modified timestamp'),
      dateSent: z.string().optional().describe('ISO 8601 date when the document was sent'),
      dateCompleted: z
        .string()
        .optional()
        .describe('ISO 8601 date when the document was completed'),
      expirationDate: z.string().nullable().optional().describe('ISO 8601 expiration date'),
      version: z.string().optional().describe('Document version'),
      createdBy: z
        .object({
          email: z.string().optional(),
          firstName: z.string().optional(),
          lastName: z.string().optional()
        })
        .optional()
        .describe('User who created the document'),
      recipients: z.array(recipientOutputSchema).describe('Document recipients'),
      fields: z.array(z.any()).optional().describe('Document fields with their values'),
      tokens: z
        .array(
          z.object({
            name: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Document tokens with their values'),
      metadata: z.record(z.string(), z.any()).optional().describe('Custom document metadata'),
      tags: z.array(z.string()).optional().describe('Document tags'),
      grandTotal: z
        .object({
          amount: z.string().optional(),
          currency: z.string().optional()
        })
        .optional()
        .describe('Document grand total'),
      linkedObjects: z.array(z.any()).optional().describe('Linked CRM objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let doc = await client.getDocumentDetails(ctx.input.documentId);

    let recipients = (doc.recipients || []).map((r: any) => ({
      recipientId: r.id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      recipientType: r.recipient_type,
      hasCompleted: r.has_completed,
      signingOrder: r.signing_order,
      sharedLink: r.shared_link
    }));

    let tokens = (doc.tokens || []).map((t: any) => ({
      name: t.name,
      value: t.value
    }));

    return {
      output: {
        documentId: doc.id,
        documentName: doc.name,
        status: doc.status,
        dateCreated: doc.date_created,
        dateModified: doc.date_modified,
        dateSent: doc.date_sent || undefined,
        dateCompleted: doc.date_completed || undefined,
        expirationDate: doc.expiration_date || null,
        version: doc.version,
        createdBy: doc.created_by
          ? {
              email: doc.created_by.email,
              firstName: doc.created_by.first_name,
              lastName: doc.created_by.last_name
            }
          : undefined,
        recipients,
        fields: doc.fields,
        tokens,
        metadata: doc.metadata,
        tags: doc.tags,
        grandTotal: doc.grand_total
          ? {
              amount: doc.grand_total.amount,
              currency: doc.grand_total.currency
            }
          : undefined,
        linkedObjects: doc.linked_objects
      },
      message: `Retrieved document **${doc.name}** with status \`${doc.status}\`. It has ${recipients.length} recipient(s).`
    };
  })
  .build();
