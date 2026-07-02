import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let verifyCredential = SlateTool.create(spec, {
  name: 'Verify Credential or Presentation',
  key: 'verify_credential',
  description: `Verify a Verifiable Credential or Verifiable Presentation. Checks that the JSON-LD document's cryptographic proof is correct and that the credential has not been revoked.
Returns a verification status with a boolean result.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      document: z
        .record(z.string(), z.unknown())
        .describe(
          'The Verifiable Credential or Verifiable Presentation JSON-LD document to verify'
        )
    })
  )
  .output(
    z.object({
      verified: z.boolean().describe('Whether the document passed verification'),
      results: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Detailed verification results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.verifyCredential(ctx.input.document);
    let verified = (result.verified === true) as boolean;

    return {
      output: {
        verified,
        results: result.results as Record<string, unknown>[] | undefined
      },
      message: verified
        ? '✅ Document verification **passed**'
        : '❌ Document verification **failed**'
    };
  })
  .build();
