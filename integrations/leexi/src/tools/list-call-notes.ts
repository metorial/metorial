import { SlateTool } from 'slates';
import { z } from 'zod';
import { callNoteSchema, mapCallNote } from '../lib/call-note';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCallNotes = SlateTool.create(spec, {
  name: 'List Call Notes',
  key: 'list_call_notes',
  description:
    'List AI-generated call notes and their translations for a call, optionally filtered by prompt. Returns note IDs for reading or updating a translation.',
  instructions: [
    'Call list_calls to find the call UUID.',
    'Requires read_calls permission. The call must be within the API key access scope.',
    'Stop paging when pagination.page reaches pagination.pages.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      callUuid: z
        .string()
        .describe('Call UUID. Call list_calls to discover accessible calls.'),
      promptUuid: z
        .string()
        .optional()
        .describe(
          'Only return notes for this prompt UUID, obtainable from get_call or list_call_notes'
        ),
      page: z.number().optional().describe('Page number (default: 1)'),
      items: z.number().optional().describe('Items per page (1-100, default: 10)')
    })
  )
  .output(
    z.object({
      callNotes: z.array(callNoteSchema).describe('Call notes and their current translations'),
      pagination: z.object({
        page: z.number(),
        items: z.number(),
        count: z.number(),
        pages: z.number().optional()
      })
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth.token).listCallNotes(ctx.input);
    return {
      output: {
        callNotes: response.data.map(mapCallNote),
        pagination: response.pagination
      },
      message: `Found **${response.pagination.count}** call notes (page ${response.pagination.page}).`
    };
  })
  .build();
