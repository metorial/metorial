import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let getBalance = SlateTool.create(spec, {
  name: 'Get Native Currency Balance',
  key: 'get_balance',
  description:
    'Retrieve the native currency balance of a blockchain address on a supported network, including raw and human-readable amounts.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      network: z
        .string()
        .describe('Network name. Call list_networks to discover supported networks.'),
      address: z.string().describe('Blockchain address to check')
    })
  )
  .output(
    z.object({
      network: z.string(),
      address: z.string(),
      symbol: z.string().describe('Native currency symbol'),
      balance: z.string().describe('Balance in the smallest currency unit'),
      decimal: z.number().describe('Currency decimal precision'),
      formatted: z.string().describe('Human-readable balance')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new StartonClient({ token: ctx.auth.token }).getBalance(
      ctx.input.network,
      ctx.input.address
    );
    return {
      output: {
        network: ctx.input.network,
        address: ctx.input.address,
        symbol: result.symbol,
        balance: result.balance,
        decimal: result.decimal,
        formatted: result.formatted
      },
      message: `Balance of ${ctx.input.address} on ${ctx.input.network}: ${result.formatted} ${result.symbol}.`
    };
  })
  .build();
