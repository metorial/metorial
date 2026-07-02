import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addLeadNote = SlateTool.create(spec, {
  name: 'Add Lead Note',
  key: 'add_lead_note',
  description: `Add a note to an existing lead in AgencyZoom. Notes are used to record interactions, observations, and other relevant information about a lead.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead to add the note to'),
      note: z.string().describe('The note text content to add to the lead')
    })
  )
  .output(
    z.object({
      note: z
        .record(z.string(), z.any())
        .describe('The created note data returned by AgencyZoom')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.addLeadNote(ctx.input.leadId, { note: ctx.input.note });
    let noteData = result.data ?? result;

    let preview =
      ctx.input.note.length > 100 ? `${ctx.input.note.substring(0, 100)}...` : ctx.input.note;

    return {
      output: {
        note: noteData
      },
      message: `Added note to lead **${ctx.input.leadId}**: "${preview}"`
    };
  })
  .build();
