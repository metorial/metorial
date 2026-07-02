import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { spec } from '../spec';

export let addCandidateNoteTool = SlateTool.create(spec, {
  name: 'Add Candidate Note',
  key: 'add_candidate_note',
  description: `Add a note to a candidate's activity feed in Greenhouse. Notes can have different visibility levels (admin only, private, or public). Requires the **On-Behalf-Of** user ID in config.`,
  constraints: ['Requires the onBehalfOf config value to be set for audit purposes.'],
  tags: { readOnly: false }
})
  .input(
    z.object({
      candidateId: z.string().describe('The candidate ID to add the note to'),
      userId: z.string().describe('The Greenhouse user ID of the person creating the note'),
      body: z.string().describe('The note content (supports HTML)'),
      visibility: z.enum(['admin_only', 'private', 'public']).describe('Note visibility level')
    })
  )
  .output(
    z.object({
      noteId: z.string(),
      candidateId: z.string(),
      body: z.string(),
      visibility: z.string(),
      createdAt: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });

    let raw = await client.addCandidateNote(Number.parseInt(ctx.input.candidateId, 10), {
      userId: Number.parseInt(ctx.input.userId, 10),
      body: ctx.input.body,
      visibility: ctx.input.visibility
    });

    return {
      output: {
        noteId: raw.id?.toString() ?? '',
        candidateId: ctx.input.candidateId,
        body: raw.body ?? ctx.input.body,
        visibility: raw.visibility ?? ctx.input.visibility,
        createdAt: raw.created_at ?? null
      },
      message: `Added a ${ctx.input.visibility} note to candidate **${ctx.input.candidateId}**.`
    };
  })
  .build();
