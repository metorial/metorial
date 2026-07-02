import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

export let addNoteTool = SlateTool.create(spec, {
  name: 'Add Note',
  key: 'add_note',
  description: `Add a note to a lead, contact, or company. Supports various note types including plain text, call records, SMS, service messages, and geolocation.`,
  instructions: [
    'For "common" notes, only "text" in noteParams is needed.',
    'For call notes ("call_in"/"call_out"), provide phone, duration, source, and optionally a link to recording.',
    'For SMS notes ("sms_in"/"sms_out"), provide text and phone.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      entityType: z
        .enum(['leads', 'contacts', 'companies'])
        .describe('Entity type to add the note to'),
      entityId: z.number().describe('ID of the entity to add the note to'),
      noteType: z
        .enum([
          'common',
          'call_in',
          'call_out',
          'sms_in',
          'sms_out',
          'service_message',
          'extended_service_message',
          'geolocation'
        ])
        .describe('Type of note'),
      noteParams: z
        .record(z.string(), z.any())
        .describe(
          'Note parameters specific to the note type (e.g., { text: "..." } for common notes, { phone: "...", duration: 60, source: "..." } for call notes)'
        )
    })
  )
  .output(
    z.object({
      noteId: z.number().describe('ID of the created note'),
      noteType: z.string().describe('Type of the note'),
      createdAt: z.number().optional().describe('Creation timestamp (Unix)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let result = await client.createNote(ctx.input.entityType, ctx.input.entityId, {
      note_type: ctx.input.noteType,
      params: ctx.input.noteParams
    });

    return {
      output: {
        noteId: result.id,
        noteType: result.note_type || ctx.input.noteType,
        createdAt: result.created_at
      },
      message: `Added **${ctx.input.noteType}** note to ${ctx.input.entityType} **${ctx.input.entityId}**.`
    };
  })
  .build();
