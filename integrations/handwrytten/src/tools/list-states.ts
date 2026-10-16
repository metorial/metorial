import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStates = SlateTool.create(spec, {
  name: 'List States',
  key: 'list_states',
  description:
    'List states or provinces for a supported country. Handwrytten documents this for the United States, Canada, and Mexico.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      countryId: z.number().int().positive().describe('Country ID from list_countries')
    })
  )
  .output(
    z.object({
      states: z
        .array(z.record(z.string(), z.unknown()))
        .describe('States or provinces returned by Handwrytten')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listStates(ctx.input.countryId);
    return {
      output: { states: result.states ?? [] },
      message: 'Retrieved supported states and provinces.'
    };
  })
  .build();
