import { SlateTool } from 'slates';
import { z } from 'zod';
import { StartonClient } from '../lib/client';
import { spec } from '../spec';

export let interactSmartContract = SlateTool.create(spec, {
  name: 'Interact with Smart Contract',
  key: 'interact_smart_contract',
  description: `Call read or write functions on a deployed smart contract.
**Read** functions are free and return on-chain data (e.g., balanceOf, totalSupply).
**Write** functions modify blockchain state and require a signer wallet and gas fees (e.g., transfer, approve, mint).`,
  instructions: [
    'For read operations, only functionName and functionParams are needed.',
    'For write operations, a signerWallet is required.',
    'Function parameters must match the ABI in the correct order.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      network: z
        .string()
        .describe('Blockchain network (e.g., ethereum-mainnet, polygon-mainnet)'),
      contractAddress: z.string().describe('Smart contract address'),
      operation: z
        .enum(['read', 'write'])
        .describe('Whether to read data or write/execute a transaction'),
      functionName: z.string().describe('Name of the smart contract function to call'),
      functionParams: z.array(z.any()).default([]).describe('Function parameters in order'),
      signerWallet: z
        .string()
        .optional()
        .describe('Wallet address for signing write transactions'),
      speed: z
        .enum(['low', 'average', 'fast', 'fastest'])
        .default('average')
        .describe('Gas fee strategy for write transactions'),
      gasLimit: z.string().optional().describe('Custom gas limit for write transactions'),
      value: z
        .string()
        .optional()
        .describe('Amount of native currency to send (in wei) for payable functions')
    })
  )
  .output(
    z.object({
      response: z
        .any()
        .describe(
          'Return value for read operations or transaction details for write operations'
        ),
      transactionHash: z.string().optional().describe('Transaction hash for write operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StartonClient({ token: ctx.auth.token });

    if (ctx.input.operation === 'read') {
      let result = await client.readSmartContract({
        network: ctx.input.network,
        address: ctx.input.contractAddress,
        functionName: ctx.input.functionName,
        params: ctx.input.functionParams
      });

      return {
        output: {
          response: result,
          transactionHash: undefined
        },
        message: `Read \`${ctx.input.functionName}\` on \`${ctx.input.contractAddress}\` (${ctx.input.network}): returned ${JSON.stringify(result)}`
      };
    } else {
      if (!ctx.input.signerWallet) {
        throw new Error('signerWallet is required for write operations');
      }
      let result = await client.callSmartContract({
        network: ctx.input.network,
        address: ctx.input.contractAddress,
        functionName: ctx.input.functionName,
        params: ctx.input.functionParams,
        signerWallet: ctx.input.signerWallet,
        speed: ctx.input.speed,
        gasLimit: ctx.input.gasLimit,
        value: ctx.input.value
      });

      let txHash = result.transactionHash || result.transaction?.transactionHash || '';

      return {
        output: {
          response: result,
          transactionHash: txHash
        },
        message: `Called \`${ctx.input.functionName}\` on \`${ctx.input.contractAddress}\` (${ctx.input.network}). Transaction: \`${txHash}\``
      };
    }
  })
  .build();
