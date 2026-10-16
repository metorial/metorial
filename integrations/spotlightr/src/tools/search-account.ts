import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchAccount = SlateTool.create(spec, {
  name: 'Search Account',
  key: 'search_account',
  description: 'Retrieve the global search response across your Spotlightr account.',
  instructions: [
    'The documented global search endpoint does not expose a search query or pagination parameters.'
  ],
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      result: z.unknown().describe('The unmodified global search response from Spotlightr.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.globalSearch();
    return { output: { result }, message: 'Retrieved the global account search response.' };
  })
  .build();
