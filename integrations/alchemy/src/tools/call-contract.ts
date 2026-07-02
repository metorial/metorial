import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let callContract = SlateTool.create(spec, {
  name: 'Call Contract',
  key: 'call_contract',
  description: `Execute a read-only call to a smart contract or estimate gas for a transaction. Does not create a transaction on the blockchain.
Use this to read smart contract state, call view/pure functions, or estimate gas costs before sending a transaction.`,
  instructions: [
    'The data field should contain the ABI-encoded function call (function selector + encoded parameters).',
    'For gas estimation, the to field can be omitted for contract deployment estimation.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      to: z.string().describe('Contract address to call'),
      data: z.string().optional().describe('ABI-encoded function call data (hex)'),
      from: z.string().optional().describe('Address to simulate the call from'),
      value: z.string().optional().describe('Value to send in hex wei'),
      gas: z.string().optional().describe('Gas limit in hex'),
      blockTag: z
        .string()
        .optional()
        .default('latest')
        .describe('Block tag to execute call at'),
      estimateGas: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, estimates gas instead of executing the call')
    })
  )
  .output(
    z.object({
      callResult: z.string().optional().describe('Return data from the contract call (hex)'),
      estimatedGas: z
        .string()
        .optional()
        .describe('Estimated gas in hex (only when estimateGas is true)'),
      estimatedGasDecimal: z.number().optional().describe('Estimated gas as decimal number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    if (ctx.input.estimateGas) {
      let estimated = await client.estimateGas({
        to: ctx.input.to,
        from: ctx.input.from,
        data: ctx.input.data,
        value: ctx.input.value
      });

      return {
        output: {
          estimatedGas: estimated,
          estimatedGasDecimal: Number.parseInt(estimated, 16)
        },
        message: `Estimated gas: **${Number.parseInt(estimated, 16).toLocaleString()}** (\`${estimated}\`).`
      };
    }

    let result = await client.call(
      {
        to: ctx.input.to,
        data: ctx.input.data,
        from: ctx.input.from,
        value: ctx.input.value,
        gas: ctx.input.gas
      },
      ctx.input.blockTag
    );

    return {
      output: {
        callResult: result
      },
      message: `Contract call returned: \`${result.length > 66 ? `${result.slice(0, 66)}...` : result}\`.`
    };
  })
  .build();
