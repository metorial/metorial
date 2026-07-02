import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadAuditTrail = SlateTool.create(spec, {
  name: 'Download Audit Trail',
  key: 'download_audit_trail',
  description: `Download the audit trail PDF for an agreement. The audit trail captures the complete history of events including creation, viewing, signing, delegation, and authentication actions.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      agreementId: z.string().describe('ID of the agreement to download the audit trail for')
    })
  )
  .output(
    z.object({
      agreementId: z.string().describe('ID of the agreement')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let data = await client.getAgreementAuditTrail(ctx.input.agreementId);

    // Convert ArrayBuffer to base64
    let bytes = new Uint8Array(data);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    let base64 = btoa(binary);

    return {
      output: {
        agreementId: ctx.input.agreementId
      },
      attachments: [createBase64Attachment(base64, 'application/pdf')],
      message: `Downloaded audit trail PDF for agreement \`${ctx.input.agreementId}\`.`
    };
  });
