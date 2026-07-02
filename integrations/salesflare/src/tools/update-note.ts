import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateNote = SlateTool.create(spec, {
  name: 'Update Internal Note',
  key: 'update_note',
  description: `Update an existing internal note on an account's timeline in Salesflare. Both accountId and body are required for updates.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      noteId: z.number().describe('ID of the note to update'),
      accountId: z.number().describe('Account ID the note belongs to'),
      body: z.string().describe('Updated note content (supports HTML)'),
      mentionUserIds: z.array(z.number()).optional().describe('Updated user IDs to mention'),
      date: z.string().optional().describe('Updated note date (ISO 8601)')
    })
  )
  .output(
    z.object({
      note: z.record(z.string(), z.any()).describe('Updated note data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let data: { account: number; body: string; mentions?: number[]; date?: string } = {
      account: ctx.input.accountId,
      body: ctx.input.body
    };
    if (ctx.input.mentionUserIds) data.mentions = ctx.input.mentionUserIds;
    if (ctx.input.date) data.date = ctx.input.date;

    let result = await client.updateNote(ctx.input.noteId, data);

    return {
      output: { note: result },
      message: `Updated internal note **${ctx.input.noteId}**.`
    };
  })
  .build();
