import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertSpotterClient } from '../lib/client';
import { spec } from '../spec';

export let authorizeCertificate = SlateTool.create(spec, {
  name: 'Authorize Certificate',
  key: 'authorize_certificate',
  description: `Mark a certificate as known/authorized so Cert Spotter will not send alerts about it. Upload a PEM-encoded certificate to suppress notifications for routine certificate renewals and reduce alert fatigue.
It is recommended to authorize **public keys** instead (via CSR) before submitting to your CA, as there is a race condition: if Cert Spotter discovers the certificate before you authorize it, you will already have been notified.`,
  instructions: [
    'The certificate must be PEM-encoded (begins with "-----BEGIN CERTIFICATE-----").',
    'Authorize certificates immediately after receiving them from your CA to minimize the chance of a race condition.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      pemCertificate: z.string().describe('PEM-encoded certificate to mark as authorized')
    })
  )
  .output(
    z.object({
      authorized: z.boolean().describe('Whether the certificate was successfully authorized')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertSpotterClient({ token: ctx.auth.token });

    await client.authorizeCertificate(ctx.input.pemCertificate);

    return {
      output: {
        authorized: true
      },
      message:
        'Certificate has been authorized. Cert Spotter will not send alerts for this certificate.'
    };
  })
  .build();
