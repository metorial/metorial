import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { mapSearchOutput, savedSearchOutputSchema } from './manage-saved-search';

export let getSavedSearch = SlateTool.create(spec, {
  name: 'Get Saved Search',
  key: 'get_saved_search',
  description:
    'Retrieve a saved property search and its notification settings. Use list_saved_searches to discover search IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      searchId: z.string().describe('UUID of the saved search from list_saved_searches')
    })
  )
  .output(savedSearchOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.config.environment });
    let search = await client.getSearch(ctx.input.searchId);
    let output = mapSearchOutput(search);

    return {
      output,
      message: `Retrieved saved search **${output.title}** (${output.searchId}).`
    };
  })
  .build();
