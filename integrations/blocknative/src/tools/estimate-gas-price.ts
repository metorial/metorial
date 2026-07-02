import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlocknativeClient } from '../lib/client';
import { spec } from '../spec';

let estimatedPriceSchema = z.object({
  confidence: z
    .number()
    .describe(
      'Probability (0-99) that the next block contains a transaction at or above this price'
    ),
  price: z.number().describe('Gas price in gwei for pre-EIP-1559 (Type 0) transactions'),
  maxPriorityFeePerGas: z
    .number()
    .describe('Max priority fee (tip) in gwei for EIP-1559 (Type 2) transactions'),
  maxFeePerGas: z
    .number()
    .describe('Max fee per gas in gwei for EIP-1559 (Type 2) transactions')
});

let blockPriceSchema = z.object({
  blockNumber: z.number().describe('Block number this prediction targets'),
  estimatedTransactionCount: z
    .number()
    .describe('Estimated number of transactions in the next block'),
  baseFeePerGas: z.number().describe('Current block base fee per gas in gwei'),
  blobBaseFeePerGas: z.number().describe('Current block blob base fee per gas in gwei'),
  estimatedPrices: z
    .array(estimatedPriceSchema)
    .describe('Gas price estimates at different confidence levels')
});

export let estimateGasPrice = SlateTool.create(spec, {
  name: 'Estimate Gas Price',
  key: 'estimate_gas_price',
  description: `Estimates the gas price needed for a transaction to be included in the next block across 40+ supported chains. Returns confidence-based predictions for both pre-EIP-1559 (Type 0) and EIP-1559 (Type 2) transactions. Supports custom confidence levels and chain selection via chain ID or system/network identifiers.`,
  instructions: [
    'Default confidence levels are 99, 95, 90, 80, 70. You can override with up to 5 custom levels.',
    'Specify the chain using chainId (e.g., 1 for Ethereum, 137 for Polygon) or system/network identifiers.',
    'If no chain is specified, defaults to Ethereum mainnet (chainId=1).'
  ],
  constraints: [
    'Up to 5 custom confidence levels allowed.',
    'Free tier updates every 5 seconds; paid tier updates every second.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      chainId: z
        .number()
        .optional()
        .describe(
          'Numeric chain ID (e.g., 1 for Ethereum, 137 for Polygon, 42161 for Arbitrum). Defaults to 1.'
        ),
      system: z
        .string()
        .optional()
        .describe('Chain ecosystem identifier (e.g., "ethereum", "polygon", "bitcoin")'),
      network: z
        .string()
        .optional()
        .describe('Specific network within the system (e.g., "main", "sepolia")'),
      confidenceLevels: z
        .array(z.number().min(1).max(99))
        .max(5)
        .optional()
        .describe('Custom confidence levels (1-99). Defaults to [99, 95, 90, 80, 70].')
    })
  )
  .output(
    z.object({
      system: z.string().describe('Blockchain ecosystem (e.g., "ethereum")'),
      network: z.string().describe('Network name (e.g., "main")'),
      unit: z.string().describe('Price unit (e.g., "gwei")'),
      maxPrice: z.number().describe('Highest priced transaction in the mempool'),
      currentBlockNumber: z.number().describe('Block number at time of prediction'),
      msSinceLastBlock: z.number().describe('Milliseconds since the last block was mined'),
      blockPrices: z.array(blockPriceSchema).describe('Block-level gas price predictions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlocknativeClient({ token: ctx.auth.token });

    let result = await client.getGasPrices({
      chainId: ctx.input.chainId,
      system: ctx.input.system,
      network: ctx.input.network,
      confidenceLevels: ctx.input.confidenceLevels
    });

    let chainLabel = `${result.system}/${result.network}`;
    let topEstimate = result.blockPrices?.[0]?.estimatedPrices?.[0];
    let summary = topEstimate
      ? `Gas estimate for **${chainLabel}** at block ${result.currentBlockNumber}: **${topEstimate.maxFeePerGas} ${result.unit}** maxFee at ${topEstimate.confidence}% confidence.`
      : `Gas estimate retrieved for **${chainLabel}** at block ${result.currentBlockNumber}.`;

    return {
      output: result,
      message: summary
    };
  })
  .build();
