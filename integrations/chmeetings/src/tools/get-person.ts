import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve the full profile of a specific person by their ID. Returns all profile fields including contact information, personal details, and address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().describe('The ID of the person to retrieve')
    })
  )
  .output(
    z.object({
      person: z.record(z.string(), z.unknown()).describe('Full person profile record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPerson(ctx.input.personId);

    return {
      output: {
        person: result.data as Record<string, unknown>
      },
      message: `Retrieved person profile for ID **${ctx.input.personId}**.`
    };
  })
  .build();
