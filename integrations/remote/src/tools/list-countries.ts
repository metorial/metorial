import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCountries = SlateTool.create(spec, {
  name: 'List Countries',
  key: 'list_countries',
  description: `List all countries supported by Remote for employment. Returns country codes, names, and available features. Use country codes when creating employments or estimating costs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      countries: z.array(z.record(z.string(), z.any())).describe('List of supported countries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let result = await client.listCountries();
    let countries = result?.data ?? result?.countries ?? [];

    return {
      output: {
        countries
      },
      message: `Found **${countries.length}** supported countries.`
    };
  });
