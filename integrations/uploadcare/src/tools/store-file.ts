import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let storeFile = SlateTool.create(spec, {
  name: 'Store File',
  key: 'store_file',
  description: `Permanently store one or more files. Unstored files are automatically deleted after 24 hours. Storing a file makes it available permanently.`,
  instructions: ['Pass a single file ID or an array of up to 100 file IDs to store in batch.'],
  constraints: ['Batch operations support up to 100 files at once.']
})
  .input(
    z.object({
      fileIds: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of file UUIDs to store (1-100)')
    })
  )
  .output(
    z.object({
      storedCount: z.number().describe('Number of files successfully stored'),
      problems: z
        .record(z.string(), z.string())
        .describe('Map of file UUIDs to error messages for any failures')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.fileIds.length === 1) {
      let file = await client.storeFile(ctx.input.fileIds[0]!);
      return {
        output: { storedCount: 1, problems: {} },
        message: `Stored file **${file.original_filename}** (${file.uuid}).`
      };
    }

    let result = await client.batchStore(ctx.input.fileIds);
    let problemCount = Object.keys(result.problems).length;

    return {
      output: {
        storedCount: result.result.length,
        problems: result.problems
      },
      message: `Stored **${result.result.length}** files.${problemCount > 0 ? ` ${problemCount} files had problems.` : ''}`
    };
  })
  .build();
