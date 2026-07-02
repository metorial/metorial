import { SlateTool } from 'slates';
import { z } from 'zod';
import { PoofClient } from '../lib/client';
import { spec } from '../spec';

export let getSmartContracts = SlateTool.create(spec, {
  name: 'Get Smart Contracts',
  key: 'get_smart_contracts',
  description: `Fetch the list of supported ERC-20 smart contracts. Poof operates EIP-1167 minimal proxy contracts on Ethereum, Avalanche, and Polygon. Supported tokens include USDC, APE, MANA, SHIB, LINK, and DAI.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      contracts: z.any().describe('List of supported ERC-20 smart contracts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PoofClient({ token: ctx.auth.token });
    let result = await client.getContractList();

    return {
      output: { contracts: result },
      message: `Fetched ERC-20 smart contract list.`
    };
  })
  .build();
