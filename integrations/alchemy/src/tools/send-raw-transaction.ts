import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let sendRawTransaction = SlateTool.create(spec, {
  name: 'Send Raw Transaction',
  key: 'send_raw_transaction',
  description: `Submit a signed transaction to the network for execution. The transaction must already be signed and hex-encoded.
Use this to broadcast pre-signed transactions to the blockchain.`,
  instructions: [
    'The transaction must be fully signed before submission.',
    'Returns the transaction hash immediately, but the transaction may take time to be mined.'
  ],
  constraints: ['This is a write operation that sends real transactions to the blockchain.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      signedTransaction: z.string().describe('Hex-encoded signed transaction data')
    })
  )
  .output(
    z.object({
      transactionHash: z.string().describe('The transaction hash of the submitted transaction')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    let txHash = await client.sendRawTransaction(ctx.input.signedTransaction);

    return {
      output: {
        transactionHash: txHash
      },
      message: `Transaction submitted successfully. Hash: \`${txHash}\`.`
    };
  })
  .build();
