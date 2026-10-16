import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let simulateTransaction = SlateTool.create(spec, {
  name: 'Simulate Transaction',
  key: 'simulate_transaction',
  description:
    'DEPRECATED — Alchemy retired this API on September 30, 2026. The original simulation tool remains for existing workflows. Its legacy success result must not be used as a transaction safety guarantee.',
  instructions: [
    'Alchemy retired alchemy_simulateExecution and alchemy_simulateAssetChanges on September 30, 2026. There is no direct replacement for the decoded asset-change simulation.',
    'Use call_contract for a read-only contract call or gas estimation; it does not provide the retired simulation asset breakdown.',
    'Provide at minimum a from and to address. Include data for contract interactions.',
    'Value should be in hex-encoded wei (e.g., "0xde0b6b3a7640000" for 1 ETH).'
  ],
  tags: {
    readOnly: true,
    deprecated: true
  }
})
  .input(
    z.object({
      from: z.string().describe('Sender address'),
      to: z.string().describe('Recipient or contract address'),
      value: z.string().optional().describe('Value in hex-encoded wei'),
      data: z.string().optional().describe('Hex-encoded calldata for contract interaction')
    })
  )
  .output(
    z.object({
      gasUsed: z.string().optional().describe('Estimated gas used'),
      logs: z.array(z.any()).optional().describe('Event logs emitted'),
      assetChanges: z
        .array(
          z.object({
            assetType: z
              .string()
              .optional()
              .describe('Type of asset (native, erc20, erc721, etc.)'),
            changeType: z
              .string()
              .optional()
              .describe('Type of change (transfer, approve, etc.)'),
            from: z.string().optional().describe('Address sending the asset'),
            to: z.string().optional().describe('Address receiving the asset'),
            amount: z.string().optional().describe('Amount of asset changed'),
            contractAddress: z.string().optional().describe('Contract address of the token'),
            tokenId: z.string().optional().describe('Token ID for NFTs'),
            name: z.string().optional().describe('Token name'),
            symbol: z.string().optional().describe('Token symbol'),
            decimals: z.number().optional().describe('Token decimals')
          })
        )
        .optional()
        .describe('Predicted asset changes from the transaction'),
      error: z.string().optional().describe('Error message if simulation fails')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    let txParams = {
      from: ctx.input.from,
      to: ctx.input.to,
      value: ctx.input.value,
      data: ctx.input.data
    };

    let [execResult, assetResult] = await Promise.allSettled([
      client.simulateExecution(txParams),
      client.simulateAssetChanges(txParams)
    ]);

    let execution = execResult.status === 'fulfilled' ? execResult.value : null;
    let assets = assetResult.status === 'fulfilled' ? assetResult.value : null;

    let assetChanges = (assets?.changes || []).map((c: any) => ({
      assetType: c.assetType,
      changeType: c.changeType,
      from: c.from,
      to: c.to,
      amount: c.amount,
      contractAddress: c.contractAddress,
      tokenId: c.tokenId,
      name: c.name,
      symbol: c.symbol,
      decimals: c.decimals
    }));

    let error = assets?.error?.message || execution?.error?.message;

    return {
      output: {
        gasUsed: execution?.gasUsed,
        logs: execution?.logs,
        assetChanges,
        error
      },
      message: error
        ? `Simulation **failed**: ${error}`
        : `Simulation **succeeded**. Gas used: ${execution?.gasUsed || 'unknown'}. ${assetChanges.length} asset change(s) predicted.`
    };
  })
  .build();
