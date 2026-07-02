import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addCustomerNote = SlateTool.create(spec, {
  name: 'Add Customer Note',
  key: 'add_customer_note',
  description: `Add a note to an existing customer record in AgencyZoom. Notes are useful for recording interactions, follow-up reminders, or any relevant information about the customer. Returns the newly created note.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('Unique identifier of the customer to add a note to'),
      note: z.string().describe('The note text content to add to the customer record')
    })
  )
  .output(
    z.object({
      note: z
        .record(z.string(), z.any())
        .describe('The newly created note record with all fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.addCustomerNote(ctx.input.customerId, {
      note: ctx.input.note
    });

    let noteId = result.noteId || result.id || '';
    let preview =
      ctx.input.note.length > 80 ? `${ctx.input.note.substring(0, 80)}...` : ctx.input.note;

    return {
      output: { note: result },
      message: `Added note to customer **${ctx.input.customerId}**${noteId ? ` (note ID: ${noteId})` : ''}: "${preview}"`
    };
  })
  .build();
