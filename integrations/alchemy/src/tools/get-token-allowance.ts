import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getTokenAllowance = SlateTool.create(spec, {
  key: 'get_token_allowance',
  name: 'Get Token Allowance',
  description:
    'Read the ERC-20 amount a spender is authorized to withdraw from an owner. Returns the allowance as a decimal string in the token’s smallest unit.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      contractAddress: z.string().describe('ERC-20 token contract address'),
      owner: z.string().describe('Wallet that granted the allowance'),
      spender: z.string().describe('Address authorized to spend the owner’s tokens')
    })
  )
  .output(
    z.object({
      contractAddress: z.string(),
      owner: z.string(),
      spender: z.string(),
      allowance: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({ token: ctx.auth.token, network: ctx.config.network });
    let allowance = await client.getTokenAllowance(
      ctx.input.contractAddress,
      ctx.input.owner,
      ctx.input.spender
    );
    return {
      output: { ...ctx.input, allowance },
      message: `The spender allowance is **${allowance}** token base units.`
    };
  })
  .build();
