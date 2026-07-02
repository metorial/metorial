import { SlateTool } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { spec } from '../spec';

export let addNote = SlateTool.create(spec, {
  name: 'Add Note',
  key: 'add_note',
  description: `Add a note to an existing relationship in Parma CRM. Notes capture touchpoints, meeting summaries, and interaction details for a given customer or contact. Use this to log conversations, follow-ups, or any relevant information.`,
  instructions: [
    'You must provide a valid relationship ID. Use the **Search Relationships** tool first if you need to find the ID for a contact.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      relationshipId: z.string().describe('ID of the relationship to add the note to'),
      content: z
        .string()
        .describe(
          'Content of the note (meeting notes, interaction details, follow-up items, etc.)'
        )
    })
  )
  .output(
    z.object({
      noteId: z.string().describe('Unique ID of the created note'),
      relationshipId: z.string().describe('ID of the associated relationship'),
      content: z.string().describe('Content of the note'),
      createdAt: z.string().optional().describe('Timestamp when the note was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ParmaClient(ctx.auth.token);

    let result = await client.createNote(ctx.input.relationshipId, {
      content: ctx.input.content
    });

    return {
      output: {
        noteId: String(result.id),
        relationshipId: ctx.input.relationshipId,
        content: result.content ?? ctx.input.content,
        createdAt: result.created_at
      },
      message: `Added note to relationship **${ctx.input.relationshipId}**.`
    };
  })
  .build();
