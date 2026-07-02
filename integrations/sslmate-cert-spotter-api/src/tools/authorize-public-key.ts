import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertSpotterClient } from '../lib/client';
import { spec } from '../spec';

export let authorizePublicKey = SlateTool.create(spec, {
  name: 'Authorize Public Key',
  key: 'authorize_public_key',
  description: `Authorize a public key so Cert Spotter will not alert about certificates using it. This is the **recommended approach** for suppressing known certificate notifications — upload CSRs before submitting them to your CA.
Supports two modes: upload a PEM-encoded CSR (DNS names are extracted automatically from the CSR's subjectAltName), or provide a public key SHA-256 hash with explicit DNS names.`,
  instructions: [
    'Prefer uploading a PEM-encoded CSR over providing a hash, as DNS names are extracted automatically.',
    'When using a public key hash, you must specify which DNS names are authorized to use the key.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      method: z
        .enum(['csr', 'hash'])
        .describe(
          'Authorization method: "csr" for PEM-encoded CSR upload, "hash" for public key SHA-256 hash'
        ),
      pemCSR: z
        .string()
        .optional()
        .describe('PEM-encoded Certificate Signing Request (required when method is "csr")'),
      pubkeySha256: z
        .string()
        .optional()
        .describe(
          'Lowercase hex-encoded SHA-256 hash of the public key (required when method is "hash")'
        ),
      dnsNames: z
        .array(z.string())
        .optional()
        .describe('DNS names authorized to use this key (required when method is "hash")')
    })
  )
  .output(
    z.object({
      authorized: z.boolean().describe('Whether the public key was successfully authorized')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertSpotterClient({ token: ctx.auth.token });

    if (ctx.input.method === 'csr') {
      if (!ctx.input.pemCSR) {
        throw new Error('pemCSR is required when method is "csr"');
      }
      await client.authorizePublicKeyByCSR(ctx.input.pemCSR);
    } else {
      if (!ctx.input.pubkeySha256) {
        throw new Error('pubkeySha256 is required when method is "hash"');
      }
      if (!ctx.input.dnsNames || ctx.input.dnsNames.length === 0) {
        throw new Error('dnsNames is required and must not be empty when method is "hash"');
      }
      await client.authorizePublicKeyByHash(ctx.input.pubkeySha256, ctx.input.dnsNames);
    }

    return {
      output: {
        authorized: true
      },
      message: `Public key has been authorized via ${ctx.input.method === 'csr' ? 'CSR upload' : 'SHA-256 hash'}. Cert Spotter will not alert about certificates using this key for the authorized DNS names.`
    };
  })
  .build();
