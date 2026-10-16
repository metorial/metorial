import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCountries = SlateTool.create(spec, {
  name: 'List Countries',
  key: 'list_countries',
  description:
    'List supported destination countries with IDs, names, delivery costs, and available states or provinces. Use country IDs in address and card tools.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      countries: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Supported countries returned by Handwrytten')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listCountries();
    return {
      output: { countries: result.countries ?? [] },
      message: 'Retrieved supported destination countries.'
    };
  })
  .build();
