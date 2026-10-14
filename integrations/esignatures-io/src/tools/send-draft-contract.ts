import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendDraftContract = SlateTool.create(spec, {
  name: 'Send Draft Contract',
  key: 'send_draft_contract',
  description:
    'Sends a contract saved as a draft to its signers to collect signatures. Use query_contract to confirm that the contract is a draft.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({ contractId: z.string().min(1).describe('ID of the draft contract to send') })
  )
  .output(z.object({ contractId: z.string(), status: z.string() }))
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).sendDraftContract(ctx.input.contractId);
    return {
      output: { contractId: ctx.input.contractId, status: result.status },
      message: `Draft contract **${ctx.input.contractId}** submitted for sending (status: ${result.status}).`
    };
  })
  .build();
