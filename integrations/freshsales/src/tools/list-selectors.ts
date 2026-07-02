import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSelectors = SlateTool.create(spec, {
  name: 'List Selectors',
  key: 'list_selectors',
  description: `Retrieve reference data (selectors) from Freshsales. Use this to get valid IDs for fields like deal stages, pipelines, lead sources, industry types, sales activity types, etc.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      selectorName: z
        .enum([
          'owners',
          'territories',
          'deal_stages',
          'deal_pipelines',
          'currencies',
          'deal_reasons',
          'deal_types',
          'lead_sources',
          'industry_types',
          'business_types',
          'campaigns',
          'deal_payment_statuses',
          'contact_statuses',
          'sales_activity_types',
          'sales_activity_outcomes',
          'lifecycle_stages'
        ])
        .describe('Name of the selector to retrieve')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('Selector items with id and name')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let items = await client.getSelector(ctx.input.selectorName);

    return {
      output: { items },
      message: `Retrieved **${items.length}** items from **${ctx.input.selectorName}** selector.`
    };
  })
  .build();
