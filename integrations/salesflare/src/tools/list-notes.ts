import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listNotes = SlateTool.create(spec, {
  name: 'List Internal Notes',
  key: 'list_notes',
  description:
    'List internal notes on one account timeline. Use the returned note IDs for updates or deletion. Date bounds and a page limit narrow the result; count is the number returned, not a total.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: z.number().int().positive().describe('Account ID from account discovery'),
      before: z.string().optional().describe('Return notes before this ISO 8601 date/time'),
      after: z.string().optional().describe('Return notes after this ISO 8601 date/time'),
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .default(20)
        .describe('Maximum notes returned; use date bounds for further pages')
    })
  )
  .output(
    z.object({
      notes: z.array(z.record(z.string(), z.unknown())),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    const notes = await new Client(ctx.auth.token).listAccountMessages(ctx.input.accountId, {
      before: ctx.input.before,
      after: ctx.input.after,
      limit: ctx.input.limit
    });
    return {
      output: { notes, count: notes.length },
      message: `Found ${notes.length} internal note(s).`
    };
  })
  .build();
