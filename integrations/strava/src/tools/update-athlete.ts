import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAthlete = SlateTool.create(spec, {
  name: 'Update Athlete',
  key: 'update_athlete',
  description: `Update the authenticated athlete's weight. Requires the \`profile:write\` scope.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      weight: z.number().describe('New weight in kilograms')
    })
  )
  .output(
    z.object({
      athleteId: z.number().describe('Athlete identifier'),
      weight: z.number().nullable().optional().describe('Updated weight in kilograms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updated = await client.updateAthlete({ weight: ctx.input.weight });

    return {
      output: {
        athleteId: updated.id,
        weight: updated.weight
      },
      message: `Updated athlete weight to **${ctx.input.weight} kg**.`
    };
  })
  .build();
