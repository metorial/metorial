import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve detailed information about a specific document by its hash, including status, signers, files, fields, and activity log. Also returns embedded signing URLs if embedded signing is enabled.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      documentHash: z.string().describe('Unique hash identifier of the document')
    })
  )
  .output(
    z.object({
      documentHash: z.string().describe('Document hash identifier'),
      title: z.string().optional().describe('Document title'),
      status: z.string().optional().describe('Current document status'),
      isDraft: z.boolean().describe('Whether the document is a draft'),
      isCompleted: z.boolean().describe('Whether the document is fully signed'),
      isCancelled: z.boolean().describe('Whether the document was cancelled'),
      isDeleted: z.boolean().describe('Whether the document was deleted'),
      isTrashed: z.boolean().describe('Whether the document is trashed'),
      isExpired: z.boolean().describe('Whether the document has expired'),
      embeddedSigningEnabled: z.boolean().describe('Whether embedded signing is enabled'),
      createdAt: z.string().optional().describe('Document creation timestamp'),
      expiresAt: z.string().optional().describe('Document expiration timestamp'),
      signers: z
        .array(
          z.object({
            signerId: z.number().describe('Signer ID'),
            name: z.string().describe('Signer name'),
            email: z.string().describe('Signer email'),
            role: z.string().optional().describe('Signer role'),
            order: z.number().optional().describe('Signing order'),
            signed: z.boolean().describe('Whether the signer has signed'),
            signedTimestamp: z
              .string()
              .optional()
              .describe('Timestamp when the signer signed'),
            declined: z.boolean().describe('Whether the signer declined'),
            embeddedSigningUrl: z.string().optional().describe('Embedded signing URL')
          })
        )
        .describe('Document signers'),
      recipients: z
        .array(
          z.object({
            name: z.string().describe('Recipient name'),
            email: z.string().describe('Recipient email')
          })
        )
        .optional()
        .describe('CC recipients'),
      meta: z.record(z.string(), z.string()).optional().describe('Custom metadata'),
      activityLog: z
        .array(
          z.object({
            event: z.string().optional().describe('Event type'),
            timestamp: z.string().optional().describe('Event timestamp'),
            signerName: z.string().optional().describe('Signer name involved')
          })
        )
        .optional()
        .describe('Document activity log')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let doc = await client.getDocument(ctx.input.documentHash);

    let signers = (doc.signers || []).map((s: any) => ({
      signerId: s.id,
      name: s.name || '',
      email: s.email || '',
      role: s.role || undefined,
      order: s.order ?? undefined,
      signed: s.signed === 1 || s.signed === true,
      signedTimestamp: s.signed_timestamp || undefined,
      declined: s.declined === 1 || s.declined === true,
      embeddedSigningUrl: s.embedded_signing_url || undefined
    }));

    let recipients = (doc.recipients || []).map((r: any) => ({
      name: r.name || '',
      email: r.email || ''
    }));

    let activityLog = (doc.log || []).map((entry: any) => ({
      event: entry.event || undefined,
      timestamp: entry.timestamp || undefined,
      signerName: entry.signer_name || undefined
    }));

    return {
      output: {
        documentHash: doc.document_hash,
        title: doc.title || undefined,
        status: doc.status || undefined,
        isDraft: doc.is_draft === 1 || doc.is_draft === true,
        isCompleted: doc.is_completed === 1 || doc.is_completed === true,
        isCancelled: doc.is_cancelled === 1 || doc.is_cancelled === true,
        isDeleted: doc.is_deleted === 1 || doc.is_deleted === true,
        isTrashed: doc.is_trashed === 1 || doc.is_trashed === true,
        isExpired: doc.is_expired === 1 || doc.is_expired === true,
        embeddedSigningEnabled:
          doc.embedded_signing_enabled === 1 || doc.embedded_signing_enabled === true,
        createdAt: doc.created ?? undefined,
        expiresAt: doc.expires ?? undefined,
        signers,
        recipients: recipients.length > 0 ? recipients : undefined,
        meta: doc.meta || undefined,
        activityLog: activityLog.length > 0 ? activityLog : undefined
      },
      message: `Retrieved document "${doc.title || doc.document_hash}" — ${signers.filter((s: any) => s.signed).length}/${signers.length} signed.`
    };
  })
  .build();
