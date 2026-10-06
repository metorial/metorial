import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';
export const addCandidateNoteTool = SlateTool.create(spec, {
  key: 'add_candidate_note',
  name: 'Add Candidate Note',
  description:
    'Add a candidate note with the specified author and visibility. There is no individual note deletion operation. Permanent candidate deletion also deletes associated notes; audit history may remain.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      candidateId: z.string().describe('The candidate ID to add the note to'),
      userId: z.string().describe('The Greenhouse user ID of the person creating the note'),
      body: z.string().describe('The note text. Newlines are stored verbatim.'),
      visibility: z.enum(['admin_only', 'private', 'public']).describe('Note visibility level')
    })
  )
  .output(
    z.object({
      noteId: z.string(),
      candidateId: z.string(),
      body: z.string(),
      visibility: z.string(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const note = await new GreenhouseClient(ctx.auth, ctx.config).addCandidateNote(
      ctx.input.candidateId,
      ctx.input
    );
    return {
      output: {
        noteId: String(note.id),
        candidateId: String(note.candidate_id),
        body: note.body!,
        visibility: note.visibility!,
        createdAt: note.created_at
      },
      message:
        'Created the candidate note. Individual note deletion is unavailable; audit history may remain.'
    };
  })
  .build();
