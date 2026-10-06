import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { fail, integer } from '../lib/validation';
import { spec } from '../spec';
export let manageCandidateNotes = SlateTool.create(spec, {
  name: 'Manage Candidate Notes',
  key: 'manage_candidate_notes',
  description:
    'List, create a team-visible note, or delete an exact note from a candidate. Deletion verifies the note belongs to that candidate and is absent from the subsequent list.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']),
      candidateId: z.number().describe('Candidate ID'),
      noteBody: z.string().optional().describe('Plain note text for create'),
      visibility: z
        .enum(['public', 'private'])
        .optional()
        .describe(
          'Default public: team-visible. Legacy private is retained but fails safely because current private-write semantics are undocumented; create private notes in Recruitee'
        ),
      noteId: z.number().optional().describe('Exact note ID for delete')
    })
  )
  .output(
    z.object({
      notes: z
        .array(
          z.object({
            noteId: z.number(),
            candidateId: z.number(),
            body: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
            pinned: z.boolean()
          })
        )
        .optional(),
      createdNoteId: z.number().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    integer(ctx.input.candidateId, 'Candidate ID');
    if (ctx.input.action === 'delete') integer(ctx.input.noteId, 'Note ID');
    if (ctx.input.action === 'create' && !ctx.input.noteBody?.trim())
      fail('noteBody is required for creating a note.');
    const client = await RecruiteeClient.forContext(ctx);
    if (ctx.input.action === 'list') {
      const result = await client.listNotes(ctx.input.candidateId);
      return {
        output: {
          notes: result.notes.map(n => ({
            noteId: n.id,
            candidateId: n.candidate_id,
            body: n.body,
            createdAt: n.created_at,
            updatedAt: n.updated_at,
            pinned: !!n.pinned_at
          }))
        },
        message: `Returned ${result.notes.length} candidate notes.`
      };
    }
    if (ctx.input.action === 'create') {
      const result = await client.createNote(
        ctx.input.candidateId,
        ctx.input.noteBody ?? '',
        ctx.input.visibility
      );
      return {
        output: { createdNoteId: result.note.id },
        message: `Created note ${result.note.id} on candidate ${ctx.input.candidateId}.`
      };
    }
    const noteId = integer(ctx.input.noteId, 'Note ID');
    const before = await client.listNotes(ctx.input.candidateId);
    if (!before.notes.some(n => n.id === noteId))
      fail('The note was not found on this candidate. No deletion was attempted.');
    await client.deleteNote(noteId);
    if ((await client.listNotes(ctx.input.candidateId)).notes.some(n => n.id === noteId))
      fail('The note remains listed after deletion. Read candidate notes before retrying.');
    return {
      output: { deleted: true },
      message: `Confirmed note ${noteId} is absent from candidate ${ctx.input.candidateId}.`
    };
  })
  .build();
