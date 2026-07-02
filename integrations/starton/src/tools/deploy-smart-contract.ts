import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

let networkEnum = z
  .enum([
    'ethereum-mainnet',
    'ethereum-sepolia',
    'polygon-mainnet',
    'polygon-amoy',
    'bsc-mainnet',
    'bsc-testnet',
    'avalanche-mainnet',
    'avalanche-fuji',
    'arbitrum-mainnet',
    'arbitrum-sepolia',
    'polygon-zkevm-mainnet',
    'polygon-zkevm-testnet'
  ])
  .describe('Blockchain network to deploy to');

export let deploySmartContract = SlateTool.create(spec, {
  name: 'Deploy Smart Contract',
  key: 'deploy_smart_contract',
  description: `Deploy a smart contract to an EVM-compatible blockchain. Supports deploying from Starton's pre-audited template library (ERC20, ERC721, ERC1155, etc.) or from custom bytecode.
Use **template deployment** for standard token contracts or **bytecode deployment** for custom contracts.`,
  instructions: [
    'Provide either a templateId for template-based deployment or both abi and bytecode for custom deployment.',
    'Constructor parameters must be provided in the correct order as expected by the contract.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      source: z
        .enum(['template', 'bytecode'])
        .describe('Whether to deploy from a template or custom bytecode'),
      templateId: z.string().optional().describe('Template ID when deploying from template'),
      abi: z.array(z.any()).optional().describe('Contract ABI when deploying from bytecode'),
      bytecode: z
        .string()
        .optional()
        .describe('Compiled contract bytecode when deploying from bytecode'),
      network: networkEnum,
      signerWallet: z
        .string()
        .describe('Wallet address to sign and pay for the deployment transaction'),
      name: z.string().describe('Name for the deployed smart contract'),
      description: z.string().optional().describe('Description for the smart contract'),
      constructorParams: z
        .array(z.any())
        .default([])
        .describe('Constructor parameters in order'),
      speed: z
        .enum(['low', 'average', 'fast', 'fastest'])
        .default('average')
        .describe('Gas fee strategy for the transaction')
    })
  )
  .output(
    z.object({
      contractAddress: z.string().describe('Deployed contract address'),
      transactionHash: z.string().describe('Deployment transaction hash'),
      network: z.string().describe('Network the contract was deployed to'),
      contractName: z.string().describe('Name of the deployed contract')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.source === 'template') {
      if (!ctx.input.templateId) {
        throw new Error('templateId is required for template deployment');
      }
      result = await client.deployFromTemplate({
        templateId: ctx.input.templateId,
        network: ctx.input.network,
        signerWallet: ctx.input.signerWallet,
        name: ctx.input.name,
        description: ctx.input.description,
        params: ctx.input.constructorParams,
        speed: ctx.input.speed
      });
    } else {
      if (!ctx.input.abi || !ctx.input.bytecode) {
        throw new Error('abi and bytecode are required for bytecode deployment');
      }
      result = await client.deployFromBytecode({
        abi: ctx.input.abi,
        bytecode: ctx.input.bytecode,
        network: ctx.input.network,
        signerWallet: ctx.input.signerWallet,
        name: ctx.input.name,
        description: ctx.input.description,
        params: ctx.input.constructorParams,
        speed: ctx.input.speed
      });
    }

    return {
      output: {
        contractAddress: result.smartContract?.address || result.address || '',
        transactionHash: result.transaction?.transactionHash || result.transactionHash || '',
        network: ctx.input.network,
        contractName: ctx.input.name
      },
      message: `Smart contract **${ctx.input.name}** deployed on **${ctx.input.network}** at \`${result.smartContract?.address || result.address || 'pending'}\`.`
    };
  })
  .build();
