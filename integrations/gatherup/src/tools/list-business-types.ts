import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listBusinessTypes = SlateTool.create(spec, {
  name: 'List Business Types',
  key: 'list_business_types',
  description:
    'Discover valid business type names for create_business and update_business. Optionally search for a category by text.',
  tags: { readOnly: true }
})
  .input(z.object({ search: z.string().optional().describe('Business type search text') }))
  .output(
    z.object({ businessTypes: z.array(z.string()).describe('Valid business type names') })
  )
  .handleInvocation(async ctx => {
    let data = await createClient(ctx).getBusinessTypes(ctx.input.search);
    let businessTypes = Object.entries(data)
      .filter(([key, value]) => /^\d+$/.test(key) && typeof value === 'string')
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, value]) => value as string);
    return {
      output: { businessTypes },
      message: `Found **${businessTypes.length}** business type(s).`
    };
  })
  .build();
