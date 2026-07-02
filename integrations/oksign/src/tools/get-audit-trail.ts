import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAuditTrail = SlateTool.create(spec, {
  name: 'Get Audit Trail',
  key: 'get_audit_trail',
  description: `Retrieve the audit trail report for a signed document as a base64-encoded PDF. The audit trail provides certified proof of all actions performed on the document — access, review, and signatures — with timestamps and document hash verification.`,
  constraints: [
    'Audit trails are available for up to 18 months after upload.',
    'Requires the signed document ID (not the source document ID).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      signedDocumentId: z.string().describe('Signed document ID (not the source document ID)')
    })
  )
  .output(
    z.object({
      auditTrailPdfBase64: z.string().describe('Base64-encoded PDF of the audit trail report')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let auditTrailPdfBase64 = await client.retrieveAuditTrail(ctx.input.signedDocumentId);

    return {
      output: { auditTrailPdfBase64 },
      message: `Audit trail retrieved for signed document \`${ctx.input.signedDocumentId}\`.`
    };
  })
  .build();
