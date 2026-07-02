import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlocknativeClient } from '../lib/client';
import { spec } from '../spec';

export let decodeL2Batch = SlateTool.create(spec, {
  name: 'Decode L2 Batch',
  key: 'decode_l2_batch',
  description: `Decodes an Ethereum L2 batch transaction into human-readable format. Accepts an L1 transaction hash of a batch (pending or confirmed) and returns decoded calldata and blobdata. Supports Optimism, Base, zkSync, Arbitrum, Mode, Zora, Kroma, and Blast batches.`,
  instructions: [
    'Provide the L1 transaction hash of the batch to decode.',
    'Use batchIndex for pagination on Optimism (frame number) or Arbitrum (sequence number) batches.',
    'Use includeStateDiffs for zkSync batches to control whether state diffs are included.'
  ],
  constraints: [
    'Supported L2s: Optimism, Base, zkSync, Arbitrum, Mode, Zora, Kroma, and Blast.',
    'Supports both calldata (type-2) and blobdata (type-3) batch transactions.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionHash: z
        .string()
        .describe('L1 transaction hash of the batch to decode (0x-prefixed)'),
      batchIndex: z
        .number()
        .optional()
        .describe('Frame number (Optimism) or sequence number (Arbitrum) for pagination'),
      includeStateDiffs: z
        .boolean()
        .optional()
        .describe('Whether to include state diffs for zkSync batches. Defaults to true.')
    })
  )
  .output(
    z.object({
      network: z
        .string()
        .describe('L2 chain identifier (e.g., "optimism", "arbitrum", "zksync")'),
      chainId: z.number().describe('Numeric chain identifier of the L2'),
      decodedBatch: z.any().describe('Decoded batch data containing calldata and/or blobdata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlocknativeClient({ token: ctx.auth.token });

    let result = await client.decodeBatch({
      transactionHash: ctx.input.transactionHash,
      batchIndex: ctx.input.batchIndex,
      initialStateDiffs: ctx.input.includeStateDiffs
    });

    return {
      output: {
        network: result.network,
        chainId: result.chainId,
        decodedBatch: result.data
      },
      message: `Decoded **${result.network}** (chain ${result.chainId}) batch from transaction \`${ctx.input.transactionHash}\`.`
    };
  })
  .build();
