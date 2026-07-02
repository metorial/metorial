import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Retrieve detailed information about a specific person (worker) by their ID. Returns full profile including personal details, employment history, manager info, and direct reports.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.string().describe('The unique ID of the person/worker')
    })
  )
  .output(
    z.object({
      person: z.record(z.string(), z.any()).describe('Full person/worker profile')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getPerson(ctx.input.personId);
    let person = result?.data ?? result;

    return {
      output: { person },
      message: `Retrieved profile for **${person.full_name ?? person.first_name ?? ctx.input.personId}**.`
    };
  })
  .build();
