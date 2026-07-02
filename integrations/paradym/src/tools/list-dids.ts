import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDids = SlateTool.create(spec, {
  name: 'List DIDs',
  key: 'list_dids',
  description: `Retrieve Decentralized Identifiers (DIDs) available in a Paradym project. DIDs are used as issuer and verifier identifiers when creating credential and presentation templates. Supports did:web and did:cheqd methods.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Number of DIDs to return per page'),
      pageAfter: z.string().optional().describe('Cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      dids: z
        .array(
          z.object({
            did: z.string().describe('The DID identifier string'),
            method: z.string().optional().describe('DID method (web, cheqd)'),
            network: z
              .string()
              .optional()
              .describe('Network for did:cheqd (e.g. mainnet, testnet)')
          })
        )
        .describe('List of DIDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.listDids({
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageAfter
    });

    let dids = (result.data ?? []).map((d: any) => ({
      did: d.did,
      method: d.method,
      network: d.network
    }));

    return {
      output: { dids },
      message: `Found **${dids.length}** DID(s).`
    };
  })
  .build();
