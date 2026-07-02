import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteDid = SlateTool.create(spec, {
  name: 'Delete DID',
  key: 'delete_did',
  description: `Permanently delete a decentralized identifier (DID) and its associated keypair. This action is **irreversible** — credentials issued with this DID will no longer be verifiable.`,
  constraints: [
    'This operation is irreversible. The DID and its keypair will be permanently removed.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      did: z.string().describe('The DID to delete')
    })
  )
  .output(
    z.object({
      did: z.string().describe('The deleted DID'),
      jobId: z.string().optional().describe('Background job ID for on-chain deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.deleteDid(ctx.input.did);

    let jobId = result?.id || result?.jobId;

    return {
      output: {
        did: ctx.input.did,
        jobId: jobId ? String(jobId) : undefined
      },
      message: `Deleted DID **${ctx.input.did}**.`
    };
  })
  .build();
