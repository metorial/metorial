import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getExecutionAddress = SlateTool.create(spec, {
  name: 'Get Execution Address',
  key: 'get_execution_address',
  description: `Look up an Ethereum execution layer address to retrieve its ETH balance, transaction count, and optionally its ERC-20 token holdings. Also provides current gas prices when requested.`,
  instructions: [
    'Pass an Ethereum address (0x...) to retrieve balance and transaction info.',
    'Enable includeTokens to also fetch ERC-20 token balances.',
    'Enable includeGasPrices to get current gas fee estimates.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      address: z.string().describe('Ethereum address (0x...)'),
      includeTokens: z
        .boolean()
        .optional()
        .describe('Include ERC-20 token holdings for the address'),
      tokenOffset: z.number().optional().describe('Pagination offset for token list'),
      tokenLimit: z.number().optional().describe('Maximum number of tokens to return'),
      includeGasPrices: z.boolean().optional().describe('Include current gas price estimates')
    })
  )
  .output(
    z.object({
      addressSummary: z
        .any()
        .describe('Address summary including ETH balance and transaction count'),
      tokens: z.any().optional().describe('ERC-20 token balances for the address'),
      gasPrices: z
        .any()
        .optional()
        .describe('Current gas price estimates (rapid, fast, standard, slow)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({
      token: ctx.auth.token,
      chain: ctx.config.chain
    });

    let addressSummary = await client.getExecutionAddress(ctx.input.address);
    let result: Record<string, any> = { addressSummary };

    if (ctx.input.includeTokens) {
      result.tokens = await client.getExecutionAddressTokens(
        ctx.input.address,
        ctx.input.tokenOffset,
        ctx.input.tokenLimit
      );
    }

    if (ctx.input.includeGasPrices) {
      result.gasPrices = await client.getGasNow();
    }

    return {
      output: result as any,
      message: `Retrieved info for address **${ctx.input.address}** on ${ctx.config.chain}.`
    };
  })
  .build();
