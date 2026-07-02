import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createNote = SlateTool.create(spec, {
  name: 'Create Note',
  key: 'create_note',
  description: `Add a note to a deal, person, or company in Pipeline CRM. Notes can be categorized (e.g., Phone Call, SMS) and include free-text content. At least one association (deal, person, or company) should be provided.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      content: z.string().describe('Note text content'),
      dealId: z.number().optional().describe('Associated deal ID'),
      personId: z.number().optional().describe('Associated person ID'),
      companyId: z.number().optional().describe('Associated company ID'),
      noteCategoryId: z
        .number()
        .optional()
        .describe('Note category ID (e.g., Phone Call, SMS)'),
      notifyUserIds: z
        .array(z.number())
        .optional()
        .describe('User IDs to notify about this note')
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('ID of the created note'),
      content: z.string().nullable().optional().describe('Note content'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appKey: ctx.auth.appKey
    });

    let noteData: Record<string, any> = {
      content: ctx.input.content
    };

    if (ctx.input.dealId !== undefined) noteData.deal_id = ctx.input.dealId;
    if (ctx.input.personId !== undefined) noteData.person_id = ctx.input.personId;
    if (ctx.input.companyId !== undefined) noteData.company_id = ctx.input.companyId;
    if (ctx.input.noteCategoryId !== undefined)
      noteData.note_category_id = ctx.input.noteCategoryId;
    if (ctx.input.notifyUserIds !== undefined)
      noteData.notify_user_ids = ctx.input.notifyUserIds;

    let note = await client.createNote(noteData);

    return {
      output: {
        noteId: note.id,
        content: note.content ?? null,
        createdAt: note.created_at ?? null
      },
      message: `Created note (ID: **${note.id}**)`
    };
  })
  .build();
