import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getTokenMetadata = SlateTool.create(spec, {
  key: 'get_token_metadata',
  name: 'Get Token Metadata',
  description:
    'Look up an ERC-20 contract name, symbol, decimal precision, and logo on the configured network.',
  tags: { readOnly: true }
})
  .input(z.object({ contractAddress: z.string().describe('ERC-20 token contract address') }))
  .output(
    z.object({
      contractAddress: z.string(),
      name: z.string().optional(),
      symbol: z.string().optional(),
      decimals: z.number().optional(),
      logo: z.string().optional(),
      raw: z
        .unknown()
        .describe('Original provider metadata, including unavailable null values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({ token: ctx.auth.token, network: ctx.config.network });
    let metadata = await client.getTokenMetadata(ctx.input.contractAddress);
    return {
      output: {
        contractAddress: ctx.input.contractAddress,
        name: metadata.name ?? undefined,
        symbol: metadata.symbol ?? undefined,
        decimals: metadata.decimals ?? undefined,
        logo: metadata.logo ?? undefined,
        raw: metadata
      },
      message: `Retrieved metadata for token \`${ctx.input.contractAddress}\`.`
    };
  })
  .build();
