import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let noteOutputSchema = z.object({
  noteId: z.number().describe('Note ID'),
  noteType: z.string().optional().describe('Note type'),
  entityId: z.number().optional().describe('Parent entity ID'),
  createdBy: z.number().optional().describe('Creator user ID'),
  updatedBy: z.number().optional().describe('Last updater user ID'),
  createdAt: z.number().optional().describe('Creation timestamp (Unix)'),
  updatedAt: z.number().optional().describe('Last update timestamp (Unix)'),
  responsibleUserId: z.number().optional().describe('Responsible user ID'),
  params: z.any().optional().describe('Note parameters (text, phone, etc.)')
});

export let listNotesTool = SlateTool.create(spec, {
  name: 'List Notes',
  key: 'list_notes',
  description: `List notes attached to a lead, contact, or company. Returns notes with their type, content, and metadata.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      entityType: z.enum(['leads', 'contacts', 'companies']).describe('Entity type'),
      entityId: z.number().describe('Entity ID'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page (max 250)')
    })
  )
  .output(
    z.object({
      notes: z.array(noteOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let notes = await client.listNotes(ctx.input.entityType, ctx.input.entityId, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let mapped = notes.map((n: any) => ({
      noteId: n.id,
      noteType: n.note_type,
      entityId: n.entity_id,
      createdBy: n.created_by,
      updatedBy: n.updated_by,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
      responsibleUserId: n.responsible_user_id,
      params: n.params
    }));

    return {
      output: { notes: mapped },
      message: `Found **${mapped.length}** note(s) for ${ctx.input.entityType} **${ctx.input.entityId}**.`
    };
  })
  .build();
