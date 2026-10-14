import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description:
    'Lists uploaded account and submission files with IDs, filenames, sizes, and MIME types. Pass a file ID to get_file to download it.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      type: z
        .enum(['all', 'account', 'formresult'])
        .optional()
        .describe('File category to list')
    })
  )
  .output(z.object({ files: z.array(z.record(z.string(), z.unknown())) }))
  .handleInvocation(async ctx => {
    let client = new FormdeskClient(ctx.auth);
    let files = await client.getFiles(ctx.input.type);
    return {
      output: { files },
      message: `Found **${files.length}** file(s).`
    };
  })
  .build();
