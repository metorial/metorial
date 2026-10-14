import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTimeEntry = SlateTool.create(spec, {
  name: 'Delete Time Entry',
  key: 'delete_time_entry',
  description:
    'Delete a Project Bubble time entry. Call list_time_entries to discover entry IDs.',
  tags: { destructive: true }
})
  .input(
    z.object({
      entryId: z
        .string()
        .describe(
          'ID of the time entry to delete. Call list_time_entries to discover entry IDs.'
        )
    })
  )
  .output(
    z.object({
      entryId: z.string().describe('Deleted time entry ID'),
      deleted: z.boolean().describe('Whether deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain ?? ctx.config.domain
    });
    await client.deleteTimeEntry(ctx.input.entryId);
    return {
      output: { entryId: ctx.input.entryId, deleted: true },
      message: `Deleted time entry **${ctx.input.entryId}**.`
    };
  })
  .build();
