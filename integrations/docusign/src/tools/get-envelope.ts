import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEnvelope = SlateTool.create(spec, {
  name: 'Get Envelope',
  key: 'get_envelope',
  description: `Retrieves detailed information about a specific DocuSign envelope, including its status, sender, recipients, and documents. Optionally includes recipient details and custom fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to retrieve'),
      includeRecipients: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include recipient details in the response'),
      includeDocuments: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include document listing in the response'),
      includeTabs: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include tab (form field) data for recipients')
    })
  )
  .output(
    z.object({
      envelopeId: z.string().describe('ID of the envelope'),
      status: z
        .string()
        .describe(
          'Current status of the envelope (e.g., sent, delivered, completed, declined, voided)'
        ),
      emailSubject: z.string().optional().describe('Subject line of the envelope email'),
      emailBlurb: z.string().optional().describe('Body text of the envelope email'),
      senderName: z.string().optional().describe('Name of the sender'),
      senderEmail: z.string().optional().describe('Email of the sender'),
      createdDateTime: z.string().optional().describe('When the envelope was created'),
      sentDateTime: z.string().optional().describe('When the envelope was sent'),
      deliveredDateTime: z.string().optional().describe('When the envelope was delivered'),
      completedDateTime: z.string().optional().describe('When the envelope was completed'),
      voidedDateTime: z.string().optional().describe('When the envelope was voided'),
      voidedReason: z.string().optional().describe('Reason the envelope was voided'),
      declinedDateTime: z.string().optional().describe('When the envelope was declined'),
      recipients: z
        .any()
        .optional()
        .describe('Recipient details (signers, carbon copies, etc.)'),
      documents: z
        .array(
          z.object({
            documentId: z.string(),
            name: z.string(),
            order: z.string().optional()
          })
        )
        .optional()
        .describe('List of documents in the envelope')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUri: ctx.auth.baseUri,
      accountId: ctx.auth.accountId
    });

    let includeParts: string[] = [];
    if (ctx.input.includeRecipients) includeParts.push('recipients');

    let envelope = await client.getEnvelope(
      ctx.input.envelopeId,
      includeParts.length > 0 ? includeParts.join(',') : undefined
    );

    let recipients: any;
    if (ctx.input.includeRecipients) {
      recipients = await client.getRecipients(ctx.input.envelopeId, ctx.input.includeTabs);
    }

    let documents: any;
    if (ctx.input.includeDocuments) {
      let docList = await client.listDocuments(ctx.input.envelopeId);
      documents = docList.envelopeDocuments?.map((doc: any) => ({
        documentId: doc.documentId,
        name: doc.name,
        order: doc.order
      }));
    }

    return {
      output: {
        envelopeId: envelope.envelopeId,
        status: envelope.status,
        emailSubject: envelope.emailSubject,
        emailBlurb: envelope.emailBlurb,
        senderName: envelope.sender?.userName,
        senderEmail: envelope.sender?.email,
        createdDateTime: envelope.createdDateTime,
        sentDateTime: envelope.sentDateTime,
        deliveredDateTime: envelope.deliveredDateTime,
        completedDateTime: envelope.completedDateTime,
        voidedDateTime: envelope.voidedDateTime,
        voidedReason: envelope.voidedReason,
        declinedDateTime: envelope.declinedDateTime,
        recipients,
        documents
      },
      message: `Envelope **${envelope.envelopeId}** is in **${envelope.status}** status. Subject: "${envelope.emailSubject || 'N/A'}"`
    };
  })
  .build();
