import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { stringOrUndefined, timestampOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Add an internal note to a contact's profile. Notes are visible only to teammates, not to the contact. Useful for recording internal context about a customer.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to add the note to'),
      body: z.string().describe('Note body (HTML supported)'),
      adminId: z.string().optional().describe('Admin ID creating the note')
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('Created note ID'),
      body: z.string().optional().describe('Note body'),
      authorId: z.string().optional().describe('Author admin ID'),
      authorName: z.string().optional().describe('Author name'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.createNote(
      ctx.input.contactId,
      ctx.input.body,
      ctx.input.adminId
    );

    return {
      output: {
        noteId: String(result.id),
        body: stringOrUndefined(result.body),
        authorId: result.author?.id ? String(result.author.id) : undefined,
        authorName: stringOrUndefined(result.author?.name),
        createdAt: timestampOrUndefined(result.created_at)
      },
      message: `Added note to contact **${ctx.input.contactId}**`
    };
  })
  .build();
