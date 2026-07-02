import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getDid = SlateTool.create(spec, {
  name: 'Get DID',
  key: 'get_did',
  description: `Resolve a decentralized identifier (DID) into its full DID document, including public keys, authentication methods, and service endpoints.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      did: z.string().describe('The DID to resolve (e.g. "did:cheqd:testnet:abc123")')
    })
  )
  .output(
    z.object({
      did: z.string().describe('The DID identifier'),
      didDocument: z.any().describe('The full DID document')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getDid(ctx.input.did);

    return {
      output: {
        did: ctx.input.did,
        didDocument: result
      },
      message: `Resolved DID **${ctx.input.did}**.`
    };
  })
  .build();
