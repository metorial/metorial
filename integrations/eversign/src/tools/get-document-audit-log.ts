import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { asOptionalString, createClient } from '../lib/helpers';
import { businessIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getDocumentAuditLog = SlateTool.create(spec, {
  name: 'Get Document Audit Log',
  key: 'get_document_audit_log',
  description:
    'Retrieve the full event history of a document, including signer details and integrity checksums. Call list_businesses to discover the businessId.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      businessId: businessIdSchema,
      documentHash: z.string().describe('Document hash from list_documents or get_document')
    })
  )
  .output(
    z.object({
      documentHash: z.string(),
      events: z.array(
        z.object({
          entryId: z.string(),
          event: z.string(),
          timestamp: z.string().optional(),
          signerId: z.string().optional(),
          signerName: z.string().optional(),
          signerEmail: z.string().optional(),
          documentChecksum: z.string().optional(),
          combinedChecksum: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let log = await createClient(
      ctx.config,
      ctx.auth,
      ctx.input.businessId
    ).getDocumentAuditLog(ctx.input.documentHash);
    if (!Array.isArray(log)) {
      throw createApiServiceError(
        'Eversign did not return the requested document audit history.'
      );
    }
    let events = log.map(entry => ({
      entryId: String(entry.entry_id),
      event: entry.event_type,
      timestamp: asOptionalString(entry.time_stamp),
      signerId: asOptionalString(entry.event_assoc_signer),
      signerName: entry.event_assoc_signer_name || undefined,
      signerEmail: entry.event_assoc_signer_email || undefined,
      documentChecksum: entry.document_checksum || undefined,
      combinedChecksum: entry.combined_checksum || undefined
    }));
    return {
      output: { documentHash: ctx.input.documentHash, events },
      message: `Retrieved ${events.length} audit event(s) for document "${ctx.input.documentHash}".`
    };
  })
  .build();
