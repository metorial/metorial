import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let copyFile = SlateTool.create(spec, {
  name: 'Copy File',
  key: 'copy_file',
  description: `Create a copy of a file within Uploadcare (local copy) or to a custom S3 storage (remote copy). Local copies can include URL API transformations applied to the source.`,
  instructions: [
    'For local copies, the source can be a file UUID or a CDN URL with transformations (e.g. ":uuid/-/resize/200x200/").',
    'For remote copies, specify the target custom storage name configured in your project.'
  ]
})
  .input(
    z.object({
      source: z
        .string()
        .describe('File UUID or CDN URL (with optional transformations) to copy'),
      copyType: z
        .enum(['local', 'remote'])
        .describe('Whether to create a local copy or remote copy to custom S3 storage'),
      store: z.boolean().optional().describe('Whether to permanently store the local copy'),
      targetStorage: z
        .string()
        .optional()
        .describe('Target custom S3 storage name (required for remote copies)'),
      makePublic: z
        .boolean()
        .optional()
        .describe('Whether copied files should be publicly accessible (remote copy only)'),
      pattern: z
        .string()
        .optional()
        .describe('File naming pattern for the target storage (remote copy only)')
    })
  )
  .output(
    z.object({
      resultType: z
        .enum(['file', 'url'])
        .describe('Type of result: "file" for local copy, "url" for remote copy'),
      fileId: z.string().optional().describe('UUID of the new local copy'),
      remoteUrl: z.string().optional().describe('S3 URL of the remote copy')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.copyType === 'local') {
      let result = await client.localCopy(ctx.input.source, ctx.input.store);
      return {
        output: {
          resultType: 'file' as const,
          fileId: result.result.uuid
        },
        message: `Created local copy with UUID **${result.result.uuid}**.`
      };
    }

    if (!ctx.input.targetStorage) {
      throw new Error('targetStorage is required for remote copies');
    }

    let result = await client.remoteCopy(ctx.input.source, ctx.input.targetStorage, {
      makePublic: ctx.input.makePublic,
      pattern: ctx.input.pattern
    });

    return {
      output: {
        resultType: 'url' as const,
        remoteUrl: result.result
      },
      message: `Created remote copy at **${result.result}**.`
    };
  })
  .build();
