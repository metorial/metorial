import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const searchPeople = SlateTool.create(spec, {
  key: 'search_people',
  name: 'Search People',
  description:
    'Search people in German company records by name, date of birth, city, and active status. Returns person IDs and one page of results for get_person and get_person_holdings.',
  tags: { readOnly: true }
})
  .input(inputs.personSearchInput)
  .output(out.personSearchOutput)
  .handleInvocation(async ctx => {
    inputs.validateFilters(ctx.input.filters);
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'search people',
      '/v1/search/person',
      out.personSearchOutput,
      { method: 'POST', body: ctx.input }
    );
    return { output: result, message: 'Search people completed.' };
  })
  .build();
