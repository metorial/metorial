import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let listSearchFilters = SlateTool.create(spec, {
  name: 'List Search Filters',
  key: 'list_search_filters',
  description:
    'Discover the available filter selectors, sort columns, and related data options for a search view. Use these selectors with the query input on search_jobs or search_invoices. Fetch once and reuse until the provider releases an API update.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      searchView: z
        .number()
        .int()
        .positive()
        .describe('Search view ID: 7 for jobs, 11 for invoices.')
    })
  )
  .output(
    z.object({
      searchView: z.number(),
      setup: z
        .record(z.string(), z.any())
        .describe('Search configuration, including filter selectors and available options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });
    let setup = await client.getSearchSetup(ctx.input.searchView);
    return {
      output: { searchView: ctx.input.searchView, setup },
      message: `Retrieved search configuration for view ${ctx.input.searchView}.`
    };
  })
  .build();
