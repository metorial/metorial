import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { references } from '../lib/schemas';
import { spec } from '../spec';

export const listReferenceData = SlateTool.create(spec, {
  name: 'List Reference Data',
  key: 'list_reference_data',
  description:
    'Discover posting category IDs, payment conditions, country tax classifications or print layout IDs. These lists supply the actual choices needed for bookkeeping and sales documents.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: z.enum([
        'posting_categories',
        'payment_conditions',
        'countries',
        'print_layouts'
      ])
    })
  )
  .output(
    z.object({
      resourceType: z.string(),
      count: z.number(),
      postingCategories: references.posting_categories.optional(),
      paymentConditions: references.payment_conditions.optional(),
      countries: references.countries.optional(),
      printLayouts: references.print_layouts.optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({ token: ctx.auth.token });
    const resourceType = ctx.input.resourceType;
    if (resourceType === 'posting_categories') {
      const items = await client.listReferenceData(resourceType);
      return {
        output: { resourceType, count: items.length, postingCategories: items },
        message: `Retrieved ${items.length} posting categories.`
      };
    }
    if (resourceType === 'payment_conditions') {
      const items = await client.listReferenceData(resourceType);
      return {
        output: { resourceType, count: items.length, paymentConditions: items },
        message: `Retrieved ${items.length} payment conditions.`
      };
    }
    if (resourceType === 'countries') {
      const items = await client.listReferenceData(resourceType);
      return {
        output: { resourceType, count: items.length, countries: items },
        message: `Retrieved ${items.length} countries.`
      };
    }
    const items = await client.listReferenceData(resourceType);
    return {
      output: { resourceType, count: items.length, printLayouts: items },
      message: `Retrieved ${items.length} print layouts.`
    };
  })
  .build();
