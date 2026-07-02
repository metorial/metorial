import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let noteSchema = z.object({
  noteId: z.number(),
  author: z.string(),
  dateCreated: z.string(),
  note: z.string(),
  customerNote: z.boolean()
});

export let manageOrderNotes = SlateTool.create(spec, {
  name: 'Manage Order Notes',
  key: 'manage_order_notes',
  description: `List, create, or delete notes on an order. Notes can be private (admin-only) or customer-visible. Useful for tracking order communication and internal notes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('The order ID'),
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      noteId: z.number().optional().describe('Note ID (required for delete)'),
      note: z.string().optional().describe('Note content (required for create)'),
      customerNote: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether the note is visible to the customer')
    })
  )
  .output(
    z.object({
      notes: z.array(noteSchema).optional(),
      createdNote: noteSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { orderId, action } = ctx.input;

    if (action === 'list') {
      let notes = await client.listOrderNotes(orderId);
      let mapped = notes.map((n: any) => ({
        noteId: n.id,
        author: n.author || '',
        dateCreated: n.date_created || '',
        note: n.note || '',
        customerNote: n.customer_note || false
      }));

      return {
        output: { notes: mapped },
        message: `Found **${mapped.length}** notes on order #${orderId}.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.note) throw new Error('note is required for create action');

      let result = await client.createOrderNote(orderId, {
        note: ctx.input.note,
        customer_note: ctx.input.customerNote
      });

      return {
        output: {
          createdNote: {
            noteId: result.id,
            author: result.author || '',
            dateCreated: result.date_created || '',
            note: result.note || '',
            customerNote: result.customer_note || false
          }
        },
        message: `Added ${ctx.input.customerNote ? 'customer' : 'private'} note to order #${orderId}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.noteId) throw new Error('noteId is required for delete action');

      await client.deleteOrderNote(orderId, ctx.input.noteId);

      return {
        output: { deleted: true },
        message: `Deleted note (ID: ${ctx.input.noteId}) from order #${orderId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
