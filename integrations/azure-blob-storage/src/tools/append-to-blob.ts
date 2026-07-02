import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let appendToBlob = SlateTool.create(spec, {
  name: 'Append to Blob',
  key: 'append_to_blob',
  description: `Append content to an existing append blob. Append blobs are optimized for append operations like logging. The blob must already exist and be of type AppendBlob - create one first using the Upload Blob tool with blobType "AppendBlob".`,
  constraints: [
    'The target blob must be of type AppendBlob.',
    'Maximum 50,000 append operations per blob.',
    'Each append block can be up to 4 MB.'
  ]
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container'),
      blobName: z.string().describe('Full name/path of the append blob'),
      content: z.string().describe('Content to append to the blob')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Container the blob belongs to'),
      blobName: z.string().describe('Name of the blob'),
      appendOffset: z.string().describe('Byte offset where the appended content starts'),
      committedBlockCount: z.number().describe('Total number of committed blocks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let result = await client.appendBlock(
      ctx.input.containerName,
      ctx.input.blobName,
      ctx.input.content
    );

    return {
      output: {
        containerName: ctx.input.containerName,
        blobName: ctx.input.blobName,
        appendOffset: result.appendOffset,
        committedBlockCount: result.committedBlockCount
      },
      message: `Appended ${ctx.input.content.length} characters to blob **${ctx.input.blobName}** at offset ${result.appendOffset} (total blocks: ${result.committedBlockCount}).`
    };
  })
  .build();
