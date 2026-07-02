import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let googleAutocomplete = SlateTool.create(spec, {
  name: 'Google Autocomplete',
  key: 'google_autocomplete',
  description: `Retrieve Google Autocomplete suggestions for a given query. Useful for keyword research, understanding search intent, and discovering related search terms.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The partial query to get autocomplete suggestions for'),
      country: z
        .string()
        .optional()
        .describe('Country code in ISO 3166 Alpha-2 format. Defaults to "us".'),
      language: z.string().optional().describe('Language for results. Defaults to "en_US".')
    })
  )
  .output(
    z.object({
      results: z.any().describe('Autocomplete suggestions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.googleAutocomplete({
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language
    });

    return {
      output: { results: data },
      message: `Fetched autocomplete suggestions for **"${ctx.input.query}"**.`
    };
  })
  .build();
