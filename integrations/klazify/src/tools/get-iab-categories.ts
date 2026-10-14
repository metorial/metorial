import { SlateTool } from 'slates';
import { z } from 'zod';
import { KlazifyClient } from '../lib/client';
import { categorySchema, refreshSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getIabCategories = SlateTool.create(spec, {
  name: 'Get IAB Categories',
  key: 'get_iab_categories',
  description:
    'Retrieves IAB Content Taxonomy V1 and V3 labels for a domain or URL. Category entries retain their IAB taxonomy IDs and confidence scores for contextual targeting and classification.',
  instructions: [
    'IAB labels are dynamic sibling fields on each category, such as IAB12 or IAB-324-JLBCU7. A category may not have a corresponding IAB label.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      url: z.string().describe('The URL or domain to classify'),
      refresh: refreshSchema
    })
  )
  .output(
    z.object({
      categories: z
        .array(categorySchema)
        .describe(
          'Categories with confidence, name, and any available IAB taxonomy ID fields'
        ),
      domainUrl: z.string().nullable().describe('The normalized domain URL'),
      updatedAt: z
        .string()
        .nullable()
        .describe('When the classification was generated or refreshed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KlazifyClient({ token: ctx.auth.token });
    let result = await client.iabCategories(ctx.input.url, ctx.input.refresh);
    let output = {
      categories: result.domain?.categories ?? [],
      domainUrl: result.domain?.domain_url ?? null,
      updatedAt: result.domain?.updated_at ?? null
    };
    return {
      output,
      message: `Found **${output.categories.length}** category entries for **${ctx.input.url}**.`
    };
  })
  .build();
