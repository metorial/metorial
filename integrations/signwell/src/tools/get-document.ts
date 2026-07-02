import { SlateTool } from 'slates';
import { z } from 'zod';
import { SignWellClient } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve a document and all its associated data including recipients, status, fields, and metadata. Use this to check the current state of a signing request.`,
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
      documentId: z.string().describe('Unique ID of the document'),
      name: z.string().optional().describe('Name of the document'),
      status: z.string().optional().describe('Current status of the document'),
      subject: z.string().optional().describe('Email subject'),
      message: z.string().optional().describe('Email message'),
      isDraft: z.boolean().optional().describe('Whether the document is in draft state'),
      requiresSigningOrder: z
        .boolean()
        .optional()
        .describe('Whether signing order is enforced'),
      embeddedSigning: z.boolean().optional().describe('Whether embedded signing is enabled'),
      expiresIn: z.number().optional().describe('Days until expiration'),
      recipients: z
        .array(
          z.object({
            recipientId: z.string().optional().describe('ID of the recipient'),
            name: z.string().optional().describe('Name of the recipient'),
            email: z.string().optional().describe('Email of the recipient'),
            status: z.string().optional().describe('Signing status'),
            signedAt: z.string().optional().describe('When the recipient signed'),
            embeddedSigningUrl: z.string().optional().describe('Embedded signing URL')
          })
        )
        .optional()
        .describe('Document recipients'),
      metadata: z.record(z.string(), z.string()).optional().describe('Document metadata'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      completedAt: z.string().optional().describe('Completion timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SignWellClient({ token: ctx.auth.token });

    let result = await client.getDocument(ctx.input.documentId);

    let output = {
      documentId: result.id,
      name: result.name,
      status: result.status,
      subject: result.subject,
      message: result.message,
      isDraft: result.is_draft,
      requiresSigningOrder: result.apply_signing_order,
      embeddedSigning: result.embedded_signing,
      expiresIn: result.expires_in,
      recipients: result.recipients?.map((r: any) => ({
        recipientId: r.id,
        name: r.name,
        email: r.email,
        status: r.status,
        signedAt: r.signed_at,
        embeddedSigningUrl: r.embedded_signing_url
      })),
      metadata: result.metadata,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      completedAt: result.completed_at
    };

    return {
      output,
      message: `Document **${result.name || result.id}** is currently **${result.status}** with ${result.recipients?.length ?? 0} recipient(s).`
    };
  })
  .build();
