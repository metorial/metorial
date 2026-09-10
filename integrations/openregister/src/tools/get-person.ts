import { SlateTool } from 'slates';
import { OpenRegisterClient } from '../lib/client';
import * as inputs from '../lib/inputs';
import * as out from '../lib/outputs';
import { spec } from '../spec';

export const getPerson = SlateTool.create(spec, {
  key: 'get_person',
  name: 'Get Person',
  description:
    'Read a person’s registry profile and management positions, with company identifiers and dates. Discover person_id using search_people.',
  tags: { readOnly: true }
})
  .input(inputs.personInput)
  .output(out.personOutput)
  .handleInvocation(async ctx => {
    const client = new OpenRegisterClient(ctx.auth.token);
    const result = await client.request(
      'get person',
      `/v1/person/${encodeURIComponent(ctx.input.person_id)}`,
      out.personOutput,
      {}
    );
    return { output: result, message: 'Get person completed.' };
  })
  .build();
