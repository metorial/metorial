import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlocknativeClient } from '../lib/client';
import { spec } from '../spec';

let baseFeeEstimateSchema = z.object({
  confidence: z.number().describe('Confidence level (e.g., 99 or 70)'),
  baseFee: z.number().describe('Estimated base fee in gwei'),
  blobBaseFee: z.number().describe('Estimated blob base fee in gwei')
});

export let predictBaseFee = SlateTool.create(spec, {
  name: 'Predict Base Fee',
  key: 'predict_base_fee',
  description: `Predicts the Ethereum base fee and blob base fee for the next 5 blocks at 99% and 70% confidence levels. Uses a quantile regression neural network model for predictions. Useful for setting optimal gas fees on Ethereum transactions.`,
  constraints: ['Only available for Ethereum mainnet.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      system: z.string().describe('Blockchain ecosystem ("ethereum")'),
      network: z.string().describe('Network name ("main")'),
      unit: z.string().describe('Price unit ("gwei")'),
      currentBlockNumber: z.number().describe('Current pending block number'),
      msSinceLastBlock: z.number().describe('Milliseconds since last block'),
      baseFeePerGas: z.number().describe('Current pending block base fee in gwei'),
      blobBaseFeePerGas: z.number().describe('Current pending block blob base fee in gwei'),
      estimatedBaseFees: z
        .array(z.record(z.string(), z.array(baseFeeEstimateSchema)))
        .describe('Predictions for the next 5 blocks keyed by "pending+1" through "pending+5"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlocknativeClient({ token: ctx.auth.token });

    let result = await client.getBaseFeeEstimates();

    let firstBlock = result.estimatedBaseFees?.[0];
    let firstKey = firstBlock ? Object.keys(firstBlock)[0] : null;
    let highConfEstimate =
      firstKey && firstBlock ? firstBlock[firstKey]?.find(e => e.confidence === 99) : null;

    let summary = highConfEstimate
      ? `Ethereum base fee prediction: current **${result.baseFeePerGas} gwei**, next block (99% confidence) **${highConfEstimate.baseFee} gwei** base fee, **${highConfEstimate.blobBaseFee} gwei** blob base fee.`
      : `Ethereum base fee prediction retrieved at block ${result.currentBlockNumber}. Current base fee: **${result.baseFeePerGas} gwei**.`;

    return {
      output: result,
      message: summary
    };
  })
  .build();
