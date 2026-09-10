import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getPersonHoldings = SlateTool.create(spec, {
  key: 'get_person_holdings',
  name: 'Get Person Holdings',
  description:
    'Find companies in which a person holds shares, stake percentages, and ownership dates. Discover person_id with search_people.',
  tags: { readOnly: true }
})
  .input(inputs.personInput)
  .output(out.personHoldingsOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get person holdings',
      `/v1/person/${encodeURIComponent(ctx.input.person_id)}/holdings`,
      out.personHoldingsOutput,
      {}
    );
    return { output: result, message: 'Get person holdings completed.' };
  })
  .build();
