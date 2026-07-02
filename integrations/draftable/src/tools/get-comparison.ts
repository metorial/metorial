import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getComparison = SlateTool.create(spec, {
  name: 'Get Comparison',
  key: 'get_comparison',
  description: `Retrieves a specific comparison by its identifier. Returns the comparison's metadata, processing status, and document details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      comparisonIdentifier: z
        .string()
        .describe('Unique identifier of the comparison to retrieve')
    })
  )
  .output(
    z.object({
      comparisonIdentifier: z.string().describe('Unique identifier of the comparison'),
      left: z.object({
        fileType: z.string().describe('File type of the left document'),
        sourceUrl: z.string().nullable().describe('Source URL of the left document'),
        displayName: z.string().nullable().describe('Display name of the left document')
      }),
      right: z.object({
        fileType: z.string().describe('File type of the right document'),
        sourceUrl: z.string().nullable().describe('Source URL of the right document'),
        displayName: z.string().nullable().describe('Display name of the right document')
      }),
      isPublic: z.boolean().describe('Whether the comparison is publicly accessible'),
      creationTime: z.string().describe('UTC timestamp when the comparison was created'),
      expiryTime: z
        .string()
        .nullable()
        .describe('UTC timestamp when the comparison will expire'),
      ready: z.boolean().describe('Whether the comparison processing is complete'),
      readyTime: z
        .string()
        .nullable()
        .describe('UTC timestamp when the comparison became ready'),
      failed: z.boolean().nullable().describe('Whether the comparison processing failed'),
      errorMessage: z.string().nullable().describe('Error message if the comparison failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getComparison(ctx.input.comparisonIdentifier);

    let status = result.failed ? 'failed' : result.ready ? 'ready' : 'processing';

    return {
      output: {
        comparisonIdentifier: result.identifier,
        left: result.left,
        right: result.right,
        isPublic: result.isPublic,
        creationTime: result.creationTime,
        expiryTime: result.expiryTime,
        ready: result.ready,
        readyTime: result.readyTime,
        failed: result.failed,
        errorMessage: result.errorMessage
      },
      message: `Comparison **${result.identifier}** is **${status}**. Left: ${result.left.fileType}, Right: ${result.right.fileType}.`
    };
  })
  .build();
