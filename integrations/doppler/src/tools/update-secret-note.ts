import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { projectInput } from '../lib/schemas';
import { spec } from '../spec';

export let updateSecretNote = SlateTool.create(spec, {
  key: 'update_secret_note',
  name: 'Update Secret Note',
  description:
    'Set the note for a secret across all environments in a Doppler project. This changes the shared documentation for that secret, without changing its value.',
  instructions: [
    'Discover the project with manage_projects and secret names with list_secret_names.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      project: projectInput,
      secret: z.string().describe('Secret name. Use list_secret_names to discover names.'),
      note: z.string().describe('Note to apply to this secret across all environments')
    })
  )
  .output(
    z.object({ result: z.unknown().describe('Original update result returned by Doppler') })
  )
  .handleInvocation(async ctx => {
    let result = await new DopplerClient({ token: ctx.auth.token }).updateSecretNote(
      ctx.input.project,
      ctx.input.secret,
      ctx.input.note
    );
    return {
      output: { result },
      message: `Updated the project-wide note for **${ctx.input.secret}**.`
    };
  })
  .build();
