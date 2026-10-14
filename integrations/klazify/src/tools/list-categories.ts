import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description:
    'Lists the full Klazify category taxonomy for version V1 or V2. Use it to inspect valid category paths or build classification filters. Each call consumes one API request.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      version: z
        .enum(['v1', 'v2'])
        .optional()
        .describe(
          'Taxonomy version. Defaults to v2; v1 and v2 are Klazify category taxonomies, not IAB versions.'
        )
    })
  )
  .output(
    z.object({
      version: z.string().describe('The taxonomy version returned by Klazify'),
      count: z.number().describe('Number of available categories'),
      categories: z.array(z.string()).describe('Full category paths')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.listCategories(ctx.input.version ?? 'v2');
    let output = {
      version: result.version,
      count: result.count,
      categories: result.categories
    };
    return {
      output,
      message: `Retrieved **${output.count}** categories for **${output.version}**.`
    };
  })
  .build();
