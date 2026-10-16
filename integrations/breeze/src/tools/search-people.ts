import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireList } from '../lib/helpers';
import { spec } from '../spec';

export let searchPeople = SlateTool.create(spec, {
  name: 'Search People by Profile Fields',
  key: 'search_people',
  description:
    'Search people using Breeze filter criteria, including custom profile field IDs and tag filters. Call list_profile_fields to discover field IDs and option values.',
  instructions: [
    'Use the exact filter keys and values from the Breeze people filter page or API reference. For example, tag_contains can be "y_16681" for a tag, and a profile field ID can map to an option ID.',
    'An omitted or zero limit asks Breeze for all matching people. Use limit and offset to paginate large results.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      filter: z
        .record(z.string(), z.any())
        .describe('Breeze filter object to send as filter_json'),
      details: z.boolean().optional().describe('Include full person details'),
      limit: z.number().optional().describe('Maximum number of matching people to return'),
      offset: z.number().optional().describe('Number of matching people to skip')
    })
  )
  .output(z.object({ people: z.array(z.any()).describe('Matching person records') }))
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let people = requireList(
      await client.listPeople({
        filterJson: JSON.stringify(ctx.input.filter),
        details: ctx.input.details,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      }),
      'people'
    );
    return { output: { people }, message: `Found **${people.length}** matching people.` };
  })
  .build();
