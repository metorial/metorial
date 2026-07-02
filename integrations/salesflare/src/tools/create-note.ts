import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Internal Note',
  key: 'create_note',
  description: `Create an internal note on an account's timeline in Salesflare. Notes support mentioning team members by their user IDs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountId: z.number().describe('Account ID to add the note to'),
      body: z.string().describe('Note content (supports HTML)'),
      mentionUserIds: z
        .array(z.number())
        .optional()
        .describe('User IDs to mention in the note'),
      date: z.string().optional().describe('Note date (ISO 8601). Defaults to current time.')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('ID of the created note'),
      note: z.record(z.string(), z.any()).describe('Created note data')
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

    let result = await client.createNote(data);
    let noteId = result.id ?? 0;

    return {
      output: {
        noteId,
        note: result
      },
      message: `Created internal note on account **${ctx.input.accountId}** (note ID: ${noteId}).`
    };
  })
  .build();
