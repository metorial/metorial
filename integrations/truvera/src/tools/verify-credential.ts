import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let verifyCredential = SlateTool.create(spec, {
  name: 'Verify Credential',
  key: 'verify_credential',
  description: `Verify a W3C Verifiable Credential or Verifiable Presentation directly. Checks cryptographic signatures, issuer validity, revocation status, and expiration. Accepts JSON-LD or JWT formatted credentials.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      credential: z
        .any()
        .describe(
          'The Verifiable Credential or Verifiable Presentation to verify (JSON-LD document or JWT string)'
        )
    })
  )
  .output(
    z.object({
      verified: z.boolean().describe('Whether the credential passed all verification checks'),
      results: z.any().optional().describe('Detailed verification results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.verifyCredential(ctx.input.credential);

    return {
      output: {
        verified: result?.verified ?? false,
        results: result?.results
      },
      message: `Credential verification **${result?.verified ? 'passed' : 'failed'}**.`
    };
  })
  .build();
