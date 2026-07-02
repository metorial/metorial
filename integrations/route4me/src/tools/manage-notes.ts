import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addNote = SlateTool.create(spec, {
  name: 'Add Note',
  key: 'add_note',
  description: `Add a text note to a stop/address within a route. Notes are commonly used by drivers for proof of delivery, status updates, and other annotations.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      routeId: z.string().describe('Route ID containing the stop'),
      routeDestinationId: z.number().describe('Route destination ID to add the note to'),
      noteContent: z.string().describe('Text content of the note'),
      updateType: z
        .string()
        .optional()
        .describe(
          'Note type: dropoff, pickup, noanswer, notfound, notpaid, paid, wrongdelivery, wrongaddressrecepient, notpresent, parts, service, other'
        ),
      deviceLatitude: z
        .number()
        .optional()
        .describe('Latitude of the device when note was created'),
      deviceLongitude: z
        .number()
        .optional()
        .describe('Longitude of the device when note was created')
    })
  )
  .output(
    z.object({
      noteId: z.number().optional().describe('Created note ID'),
      success: z.boolean().describe('Whether the note was added'),
      note: z.any().optional().describe('Note details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body = {
      strNoteContents: ctx.input.noteContent,
      strUpdateType: ctx.input.updateType || 'dropoff',
      dev_lat: ctx.input.deviceLatitude || 0,
      dev_lng: ctx.input.deviceLongitude || 0
    };

    let result = await client.addNote(ctx.input.routeId, ctx.input.routeDestinationId, body);

    return {
      output: {
        noteId: result.note_id || result.note?.note_id,
        success: true,
        note: result.note
      },
      message: `Added note to destination **${ctx.input.routeDestinationId}** on route **${ctx.input.routeId}**.`
    };
  })
  .build();

export let getNotes = SlateTool.create(spec, {
  name: 'Get Notes',
  key: 'get_notes',
  description: `Retrieve notes for a specific stop/address on a route. Returns all notes including text content and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      routeId: z.string().describe('Route ID'),
      routeDestinationId: z.number().describe('Route destination ID to get notes for')
    })
  )
  .output(
    z.object({
      notes: z
        .array(
          z.object({
            noteId: z.number().optional().describe('Note ID'),
            noteContent: z.string().optional().describe('Note text content'),
            uploadType: z.string().optional().describe('Note type'),
            timestamp: z.number().optional().describe('Note creation timestamp'),
            latitude: z.number().optional().describe('Latitude where note was created'),
            longitude: z.number().optional().describe('Longitude where note was created')
          })
        )
        .describe('List of notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getNotes(ctx.input.routeId, ctx.input.routeDestinationId);
    let notes = result.notes || [];

    return {
      output: {
        notes: notes.map((n: any) => ({
          noteId: n.note_id,
          noteContent: n.contents,
          uploadType: n.upload_type,
          timestamp: n.ts_added,
          latitude: n.lat,
          longitude: n.lng
        }))
      },
      message: `Retrieved ${notes.length} note(s) for destination **${ctx.input.routeDestinationId}**.`
    };
  })
  .build();
