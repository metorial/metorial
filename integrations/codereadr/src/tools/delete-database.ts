import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDatabase = SlateTool.create(spec, {
  name: 'Delete Database',
  key: 'delete_database',
  description: `Delete a barcode validation database or clear all of its values. Use the "clear" operation to remove all values while keeping the database, or "delete" to permanently remove the database entirely.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database'),
      operation: z
        .enum(['delete', 'clear'])
        .describe(
          '"delete" removes the database entirely; "clear" removes all values but keeps the database'
        )
    })
  )
  .output(
    z.object({
      databaseId: z.string().describe('ID of the affected database'),
      operation: z.string().describe('Operation performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.operation === 'clear') {
      await client.clearDatabase(ctx.input.databaseId);
    } else {
      await client.deleteDatabase(ctx.input.databaseId);
    }

    return {
      output: {
        databaseId: ctx.input.databaseId,
        operation: ctx.input.operation
      },
      message:
        ctx.input.operation === 'clear'
          ? `Cleared all values from database **${ctx.input.databaseId}**.`
          : `Deleted database **${ctx.input.databaseId}**.`
    };
  })
  .build();
