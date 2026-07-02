import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let deduplicateRows = SlateTool.create(spec, {
  name: 'Deduplicate Rows',
  key: 'deduplicate_rows',
  description: `Detect and remove duplicate rows from a Gigasheet sheet. You can first count duplicates before deleting, and optionally scope duplication detection to specific columns.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet'),
      action: z
        .enum(['count', 'delete'])
        .describe('Whether to count duplicates or delete them'),
      columns: z
        .array(z.string())
        .optional()
        .describe(
          'Columns to consider when determining duplicates. If omitted, all columns are used.'
        )
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.unknown())
        .describe('Deduplication result including count of duplicates found or removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: Record<string, unknown>;

    if (ctx.input.action === 'count') {
      result = await client.countDuplicates(ctx.input.sheetHandle, ctx.input.columns);
    } else {
      result = await client.deleteDuplicates(ctx.input.sheetHandle, ctx.input.columns);
    }

    return {
      output: { result },
      message:
        ctx.input.action === 'count'
          ? `Duplicate count completed.`
          : `Duplicate rows deleted successfully.`
    };
  })
  .build();
