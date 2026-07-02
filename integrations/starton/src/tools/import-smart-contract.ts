import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let importSmartContract = SlateTool.create(spec, {
  name: 'Import Smart Contract',
  key: 'import_smart_contract',
  description: `Import an already deployed smart contract into your Starton project. This allows you to interact with and monitor contracts that were deployed outside of Starton.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      network: z.string().describe('Blockchain network where the contract is deployed'),
      contractAddress: z.string().describe('Address of the deployed contract'),
      name: z.string().describe('Name for the imported contract'),
      description: z.string().optional().describe('Description for the imported contract'),
      abi: z.array(z.any()).describe('Contract ABI (Application Binary Interface)')
    })
  )
  .output(
    z.object({
      contractAddress: z.string().describe('Imported contract address'),
      network: z.string().describe('Network of the imported contract'),
      contractName: z.string().describe('Name of the imported contract')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });

    let result = await client.importSmartContract({
      abi: ctx.input.abi,
      network: ctx.input.network,
      address: ctx.input.contractAddress,
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        contractAddress: result.address || ctx.input.contractAddress,
        network: result.network || ctx.input.network,
        contractName: result.name || ctx.input.name
      },
      message: `Imported contract **${ctx.input.name}** at \`${ctx.input.contractAddress}\` on ${ctx.input.network}.`
    };
  })
  .build();
