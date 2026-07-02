import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createDid = SlateTool.create(spec, {
  name: 'Create DID',
  key: 'create_did',
  description: `Create a new decentralized identifier (DID) on the blockchain. Supports **did:cheqd** (on-chain) and **did:key** (non-registry) methods. The DID can be used as an issuer or verifier identity for credentials.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      didType: z
        .enum(['cheqd', 'key'])
        .default('cheqd')
        .describe(
          'DID method type. "cheqd" creates an on-chain DID; "key" creates a non-registry DID.'
        ),
      keyType: z
        .enum(['ed25519', 'bjj'])
        .default('ed25519')
        .describe(
          'Cryptographic key type. Use "bjj" for BBS+ zero-knowledge proof credentials.'
        ),
      controller: z
        .string()
        .optional()
        .describe('DID of the controller. Defaults to the created DID itself.')
    })
  )
  .output(
    z.object({
      did: z.string().describe('The created DID identifier'),
      jobId: z.string().optional().describe('Background job ID for on-chain operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createDid({
      type: ctx.input.didType,
      keyType: ctx.input.keyType,
      controller: ctx.input.controller
    });

    let did = result?.did || result?.data?.did || '';
    let jobId = result?.id || result?.jobId;

    return {
      output: {
        did,
        jobId: jobId ? String(jobId) : undefined
      },
      message: `Created DID **${did}** using the ${ctx.input.didType} method with ${ctx.input.keyType} key type.`
    };
  })
  .build();
