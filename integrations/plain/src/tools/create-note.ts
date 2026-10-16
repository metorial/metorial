import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  key: 'create_note',
  name: 'Create Note',
  description:
    'Create an internal note visible only to your team. Target a customer or an individual thread belonging to that customer.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      customerId: z.string().describe('Customer ID from get_customer or list_customers'),
      threadId: z
        .string()
        .optional()
        .describe('Optional thread ID; omit to show the note across the customer’s threads'),
      text: z.string().describe('Plain-text note body'),
      markdown: z.string().optional().describe('Optional rich-text Markdown version')
    })
  )
  .output(z.object({ noteId: z.string(), createdAt: z.string() }))
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).createNote(ctx.input);
    return {
      output: { noteId: result.note.id, createdAt: result.note.createdAt.iso8601 },
      message: `Created internal note **${result.note.id}**`
    };
  })
  .build();
