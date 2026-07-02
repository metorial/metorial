import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let createPresentation = SlateTool.create(spec, {
  name: 'Create Presentation',
  key: 'create_presentation',
  description: `Create and sign a Verifiable Presentation from one or more Verifiable Credentials. Presentations bundle credentials together for sharing with a verifier.`,
  instructions: [
    'Provide the holder DID and one or more full credential JSON-LD documents.',
    'Optionally include a challenge and domain for additional security.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      holderDid: z.string().describe('DID of the credential holder creating the presentation'),
      credentials: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of Verifiable Credential JSON-LD documents to include'),
      challenge: z.string().optional().describe('Challenge string for replay protection'),
      domain: z.string().optional().describe('Domain the presentation is intended for')
    })
  )
  .output(
    z.object({
      presentation: z
        .record(z.string(), z.unknown())
        .describe('The signed Verifiable Presentation document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.createPresentation({
      holder: ctx.input.holderDid,
      credentials: ctx.input.credentials,
      challenge: ctx.input.challenge,
      domain: ctx.input.domain
    });

    return {
      output: { presentation: result },
      message: `Created presentation with **${ctx.input.credentials.length}** credential(s) for holder **${ctx.input.holderDid}**`
    };
  })
  .build();
