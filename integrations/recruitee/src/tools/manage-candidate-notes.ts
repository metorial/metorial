import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { spec } from '../spec';

export let manageCandidateNotes = SlateTool.create(spec, {
  name: 'Manage Candidate Notes',
  key: 'manage_candidate_notes',
  description: `List, create, or delete notes on a candidate profile. Notes are used for internal comments, interview feedback, and collaboration between team members.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      candidateId: z.number().describe('ID of the candidate'),
      noteBody: z
        .string()
        .optional()
        .describe('Note text content (required for "create" action)'),
      visibility: z
        .enum(['public', 'private'])
        .optional()
        .describe(
          'Note visibility: "public" (visible to all team members) or "private" (only visible to creator). Default: public'
        ),
      noteId: z
        .number()
        .optional()
        .describe('ID of the note to delete (required for "delete" action)')
    })
  )
  .output(
    z.object({
      notes: z
        .array(
          z.object({
            noteId: z.number().describe('Note ID'),
            candidateId: z.number().describe('Candidate ID'),
            body: z.string().describe('Note text content'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp'),
            pinned: z.boolean().describe('Whether the note is pinned')
          })
        )
        .optional()
        .describe('List of notes (returned for "list" action)'),
      createdNoteId: z
        .number()
        .optional()
        .describe('ID of newly created note (returned for "create" action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the note was deleted (returned for "delete" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RecruiteeClient({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    if (ctx.input.action === 'list') {
      let result = await client.listNotes(ctx.input.candidateId);
      let notes = result.notes || [];
      return {
        output: {
          notes: notes.map((n: any) => ({
            noteId: n.id,
            candidateId: n.candidate_id,
            body: n.body || '',
            createdAt: n.created_at,
            updatedAt: n.updated_at,
            pinned: !!n.pinned_at
          }))
        },
        message: `Found ${notes.length} notes for candidate ${ctx.input.candidateId}.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.noteBody) {
        throw new Error('noteBody is required for creating a note.');
      }
      let result = await client.createNote(
        ctx.input.candidateId,
        ctx.input.noteBody,
        ctx.input.visibility
      );
      let note = result.note;
      return {
        output: {
          createdNoteId: note.id
        },
        message: `Created note (ID: ${note.id}) on candidate ${ctx.input.candidateId}.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.noteId) {
        throw new Error('noteId is required for deleting a note.');
      }
      await client.deleteNote(ctx.input.noteId);
      return {
        output: {
          deleted: true
        },
        message: `Deleted note ${ctx.input.noteId}.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
