import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

export let revokeCertificate = SlateTool.create(spec, {
  name: 'Revoke Certificate',
  key: 'revoke_certificate',
  description: `Revoke an issued certificate in DigiCert CertCentral. After revocation, the certificate will no longer be trusted by browsers and clients. This action may require approval depending on account settings.`,
  constraints: [
    'Revocation is irreversible — once revoked, a certificate cannot be unrevoked.',
    'May require admin approval depending on account configuration.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      certificateId: z.string().describe('ID of the certificate to revoke'),
      comments: z.string().optional().describe('Reason or comments for the revocation'),
      skipApproval: z
        .boolean()
        .optional()
        .describe('Skip the approval step if your account permits it')
    })
  )
  .output(
    z.object({
      requestId: z
        .number()
        .optional()
        .describe('ID of the revocation request if approval is required'),
      revoked: z.boolean().describe('Whether the certificate was revoked immediately')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    ctx.progress('Submitting revocation request...');
    let result = await client.revokeCertificate(ctx.input.certificateId, {
      comments: ctx.input.comments,
      skip_approval: ctx.input.skipApproval
    });

    let requestId = result?.id || result?.request?.id;
    let revoked = !requestId;

    return {
      output: {
        requestId,
        revoked
      },
      message: revoked
        ? `Certificate **${ctx.input.certificateId}** has been revoked.`
        : `Revocation request submitted for certificate **${ctx.input.certificateId}** (Request ID: ${requestId}). Awaiting approval.`
    };
  })
  .build();
