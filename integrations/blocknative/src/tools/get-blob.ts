import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlocknativeClient } from '../lib/client';
import { spec } from '../spec';

export let getBlob = SlateTool.create(spec, {
  name: 'Get Blob',
  key: 'get_blob',
  description: `Retrieves archived Ethereum blob data by versioned hash. Returns the commitment, proof, byte counts, and optionally the full blob data. Stores all blobs that entered the Ethereum mempool (confirmed or not), providing access to historical blob data beyond Ethereum's ~18-day ephemeral storage window.`,
  instructions: [
    'Set includeData to false for a lighter response that excludes the raw blob data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      versionedHash: z.string().describe('The blob versioned hash (0x-prefixed)'),
      includeData: z
        .boolean()
        .optional()
        .describe('Whether to include the raw blob data in the response. Defaults to true.')
    })
  )
  .output(
    z.object({
      versionedHash: z.string().describe('Blob versioned hash'),
      commitment: z.string().describe('KZG commitment to the polynomial (0x-prefixed hex)'),
      proof: z.string().describe('KZG commitment proof-of-evaluation (0x-prefixed hex)'),
      zeroBytes: z.number().describe('Count of zero bytes in blob data'),
      nonZeroBytes: z.number().describe('Count of non-zero bytes in blob data'),
      blobData: z
        .string()
        .describe('Raw blob data as 0x-prefixed hex (empty string if includeData was false)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlocknativeClient({ token: ctx.auth.token });

    let result = await client.getBlob({
      versionedHash: ctx.input.versionedHash,
      includeData: ctx.input.includeData
    });

    let blob = result.blob;

    return {
      output: {
        versionedHash: blob.versionedHash,
        commitment: blob.commitment,
        proof: blob.proof,
        zeroBytes: blob.zeroBytes,
        nonZeroBytes: blob.nonZeroBytes,
        blobData: blob.data || ''
      },
      message: `Retrieved blob \`${blob.versionedHash}\`: **${blob.nonZeroBytes}** non-zero bytes, **${blob.zeroBytes}** zero bytes.`
    };
  })
  .build();
