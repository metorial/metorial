import { SlateTool } from 'slates';
import { z } from 'zod';
import { asOptionalNumber, asOptionalString, createClient, isEnabled } from '../lib/helpers';
import { businessIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve detailed information about a specific document by its hash, including status, signers, files, fields, and activity log. Also returns embedded signing URLs if embedded signing is enabled. Call list_businesses to discover the businessId.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: businessIdSchema,
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
    let client = createClient(ctx.config, ctx.auth, ctx.input.businessId);
    let doc = await client.getDocument(ctx.input.documentHash);

    let signers = (doc.signers || []).map((s: any) => ({
      signerId: Number(s.id),
      name: s.name || '',
      email: s.email || '',
      role: s.role || undefined,
      order: asOptionalNumber(s.order),
      signed: isEnabled(s.signed),
      signedTimestamp: asOptionalString(s.signed_timestamp),
      declined: isEnabled(s.declined),
      embeddedSigningUrl: s.embedded_signing_url || undefined
    }));

    let recipients = (doc.recipients || []).map((r: any) => ({
      name: r.name || '',
      email: r.email || ''
    }));

    let activityLog = (doc.log || []).map((entry: any) => ({
      event: entry.event || undefined,
      timestamp: asOptionalString(entry.timestamp),
      signerName:
        entry.signer_name ||
        doc.signers?.find((signer: any) => String(signer.id) === String(entry.signer))?.name ||
        undefined
    }));

    return {
      output: {
        documentHash: doc.document_hash,
        title: doc.title || undefined,
        status: doc.status || undefined,
        isDraft: isEnabled(doc.is_draft),
        isCompleted: isEnabled(doc.is_completed),
        isCancelled: isEnabled(doc.is_cancelled),
        isDeleted: isEnabled(doc.is_deleted),
        isTrashed: isEnabled(doc.is_trashed),
        isExpired: isEnabled(doc.is_expired),
        embeddedSigningEnabled: isEnabled(doc.embedded_signing_enabled),
        createdAt: asOptionalString(doc.created),
        expiresAt: asOptionalString(doc.expires),
        signers,
        recipients: recipients.length > 0 ? recipients : undefined,
        meta: doc.meta || undefined,
        activityLog: activityLog.length > 0 ? activityLog : undefined
      },
      message: `Retrieved document "${doc.title || doc.document_hash}" — ${signers.filter((s: any) => s.signed).length}/${signers.length} signed.`
    };
  })
  .build();
