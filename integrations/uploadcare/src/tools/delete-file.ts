import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteFile = SlateTool.create(spec, {
  name: 'Delete File',
  key: 'delete_file',
  description: `Delete one or more files from Uploadcare storage. Deleted files are no longer accessible via CDN.`,
  constraints: ['Batch operations support up to 100 files at once.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fileIds: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of file UUIDs to delete (1-100)')
    })
  )
  .output(
    z.object({
      deletedCount: z.number().describe('Number of files successfully deleted'),
      problems: z
        .record(z.string(), z.string())
        .describe('Map of file UUIDs to error messages for any failures')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    if (ctx.input.fileIds.length === 1) {
      await client.deleteFile(ctx.input.fileIds[0]!);
      return {
        output: { deletedCount: 1, problems: {} },
        message: `Deleted file ${ctx.input.fileIds[0]}.`
      };
    }

    let result = await client.batchDelete(ctx.input.fileIds);
    let problemCount = Object.keys(result.problems).length;

    return {
      output: {
        deletedCount: result.result.length,
        problems: result.problems
      },
      message: `Deleted **${result.result.length}** files.${problemCount > 0 ? ` ${problemCount} files had problems.` : ''}`
    };
  })
  .build();
