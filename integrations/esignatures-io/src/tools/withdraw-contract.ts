import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let withdrawContract = SlateTool.create(spec, {
  name: 'Withdraw Contract',
  key: 'withdraw_contract',
  description: `Withdraws a contract to prevent further signing. The contract data is retained but signers can no longer sign it. Can also be used when a signer declines.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      contractId: z.string().describe('ID of the contract to withdraw')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the withdrawal request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Withdrawing contract...');

    let result = await client.withdrawContract(ctx.input.contractId);

    return {
      output: {
        status: result?.status || 'queued'
      },
      message: `Contract **${ctx.input.contractId}** has been withdrawn. Signers can no longer sign this contract.`
    };
  })
  .build();
