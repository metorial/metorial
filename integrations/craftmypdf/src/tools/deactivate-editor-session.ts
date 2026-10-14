import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deactivateEditorSession = SlateTool.create(spec, {
  name: 'Deactivate Editor Session',
  key: 'deactivate_editor_session',
  description:
    'Revoke an embedded template editor session using the session token returned when it was created.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      sessionToken: z
        .string()
        .min(1)
        .describe('Session token returned by Create Editor Session.')
    })
  )
  .output(z.object({ status: z.string().describe('Status of session deactivation.') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.deactivateEditorSession(ctx.input.sessionToken);
    return { output: { status: result.status }, message: 'Editor session deactivated.' };
  })
  .build();
