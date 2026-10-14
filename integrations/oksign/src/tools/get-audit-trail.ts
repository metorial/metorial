import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAuditTrail = SlateTool.create(spec, {
  name: 'Get Audit Trail',
  key: 'get_audit_trail',
  description: `Retrieve a downloadable PDF audit trail report for a source or signed document. The audit trail provides certified proof of all actions performed on the document — access, review, and signatures — with timestamps and document hash verification.`,
  constraints: [
    'Audit trails are available for up to 18 months after upload.',
    'Reports are available for documents uploaded after 2023-10-02.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      signedDocumentId: z
        .string()
        .describe('Source or signed document ID. Source IDs also work before signing.')
    })
  )
  .output(
    z.object({
      auditTrailPdfBase64: z
        .string()
        .describe(
          'Legacy base64 PDF content retained for compatibility; the report is also downloadable'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let auditTrailPdfBase64 = await client.retrieveAuditTrail(ctx.input.signedDocumentId);

    await ctx.addAttachment({
      type: 'url',
      url: 'https://oksign.be/services/rest/v1/audittrail/retrieve',
      mimeType: 'application/pdf',
      headers: {
        'x-oksign-authorization': ctx.auth.token,
        'x-oksign-docid': ctx.input.signedDocumentId,
        'x-oksign-format': 'pdf',
        accept: 'application/pdf'
      }
    });

    return {
      output: { auditTrailPdfBase64 },
      message: `Audit trail retrieved for signed document \`${ctx.input.signedDocumentId}\`.`
    };
  })
  .build();
