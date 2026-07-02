import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve detailed information about a specific person by their ID. Returns full contact info, address, custom profile fields, and other person details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.string().describe('ID of the person to retrieve')
    })
  )
  .output(
    z.object({
      person: z.any().describe('Full person record with all details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let person = await client.getPerson(ctx.input.personId, true);

    return {
      output: { person },
      message: `Retrieved person **${person?.first_name || ''} ${person?.last_name || ''}** (ID: ${ctx.input.personId}).`
    };
  })
  .build();
