import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageNote = SlateTool.create(spec, {
  name: 'Manage Note',
  key: 'manage_note',
  description: `Add, list, or delete internal notes on a conversation. Notes are used for team collaboration and are not visible to customers. Use this to document context, follow-up actions, or share information with teammates.`
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'delete']).describe('The operation to perform'),
      conversationId: z.string().describe('ID of the conversation'),
      noteId: z.string().optional().describe('Note ID (required for delete)'),
      body: z.string().optional().describe('Note content (required for add)'),
      mailboxId: z.string().optional().describe('Mailbox ID (optional, for add)')
    })
  )
  .output(
    z.object({
      notes: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of notes (for list action)'),
      note: z
        .record(z.string(), z.any())
        .optional()
        .describe('Created note details (for add action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, conversationId, noteId, body, mailboxId } = ctx.input;

    if (action === 'list') {
      let result = await client.listNotes(conversationId);
      let notes = Array.isArray(result) ? result : (result.notes ?? result.data ?? []);
      return {
        output: { notes, success: true },
        message: `Retrieved ${notes.length} note(s) for conversation **${conversationId}**.`
      };
    }

    if (action === 'add') {
      if (!body) throw new Error('body is required for add action');
      let note = await client.addNote(conversationId, { body, mailbox_id: mailboxId });
      return {
        output: { note, success: true },
        message: `Added note to conversation **${conversationId}**.`
      };
    }

    if (action === 'delete') {
      if (!noteId) throw new Error('noteId is required for delete action');
      await client.deleteNote(conversationId, noteId);
      return {
        output: { success: true },
        message: `Deleted note **${noteId}** from conversation **${conversationId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
