import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let setOrganisationChasing = SlateTool.create(spec, {
  name: 'Pause or Resume Organisation Chasing',
  key: 'set_organisation_chasing',
  description:
    'Pause or resume payment reminders for the entire connected organisation. Pausing stops all invoice chasing until organisation chasing is resumed.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z.enum(['pause', 'resume']).describe('Pause or resume organisation chasing')
    })
  )
  .output(
    z.object({
      organisationInternalId: z.string().describe('Internal Chaser organisation ID'),
      chasing: z.boolean().describe('Whether organisation chasing is enabled')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.setOrganisationChasing(ctx.input.action);
    return {
      output: { organisationInternalId: result.id, chasing: result.chasing },
      message: `Organisation chasing is ${result.chasing ? 'enabled' : 'paused'}.`
    };
  })
  .build();
