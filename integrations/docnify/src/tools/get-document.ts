import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  recipientId: z.string().describe('ID of the recipient'),
  recipientEmail: z.string().describe('Email address of the recipient'),
  recipientName: z.string().describe('Name of the recipient'),
  signedAt: z
    .string()
    .optional()
    .describe('Timestamp when the recipient signed, if applicable')
});

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieves detailed information about a specific Docnify document, including its status, recipients, and signing progress. Use this to check the current state of a document or verify recipient details.`,
  tags: {
    destructive: false,
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
      documentId: z.string().describe('ID of the document'),
      documentName: z.string().describe('Name of the document'),
      status: z.string().describe('Current status of the document'),
      templateId: z
        .string()
        .optional()
        .describe('ID of the template used to create the document'),
      createdAt: z.string().describe('Timestamp when the document was created'),
      updatedAt: z.string().describe('Timestamp when the document was last updated'),
      recipients: z
        .array(recipientSchema)
        .describe('List of recipients assigned to the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let document = await client.getDocument(ctx.input.documentId);

    let recipients = (document.recipients || []).map(r => ({
      recipientId: r.recipientId,
      recipientEmail: r.email,
      recipientName: r.name,
      signedAt: r.signedAt
    }));

    let signedCount = recipients.filter(r => r.signedAt).length;
    let totalCount = recipients.length;

    return {
      output: {
        documentId: document.id,
        documentName: document.name,
        status: document.status,
        templateId: document.templateId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        recipients
      },
      message: `Document **${document.name}** (ID: ${document.id}) — Status: ${document.status}. ${signedCount}/${totalCount} recipients have signed.`
    };
  })
  .build();
