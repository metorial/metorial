import { SlateTool } from 'slates';
import { z } from 'zod';
import { ProcFuClient } from '../lib/client';
import { spec } from '../spec';

export let searchPodioItems = SlateTool.create(spec, {
  name: 'Search Podio Items',
  key: 'search_podio_items',
  description: `Search for items in a Podio app by matching a field value. Supports exact match or contains condition.
Returns up to 20 matching items. Use simplified mode to get compact contact/field values.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      appId: z.string().describe('The Podio App ID to search in'),
      fieldId: z.string().describe('The field ID or external ID to search by'),
      searchValue: z.string().describe('The value to search for'),
      condition: z
        .enum(['equals', 'contains'])
        .default('contains')
        .describe('Search condition: exact match or substring match'),
      maxResults: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of results to return (up to 20)'),
      simplified: z
        .boolean()
        .optional()
        .default(false)
        .describe('Return simplified field values (e.g. contact name only)')
    })
  )
  .output(
    z.object({
      items: z.array(z.any()).describe('Array of matching Podio item objects'),
      count: z.number().describe('Number of items returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ProcFuClient({ token: ctx.auth.token });

    let conditionCode = ctx.input.condition === 'equals' ? 'E' : 'C';

    let result = await client.searchApp(
      ctx.input.appId,
      ctx.input.fieldId,
      ctx.input.searchValue,
      conditionCode,
      ctx.input.maxResults,
      ctx.input.simplified
    );

    let items = Array.isArray(result) ? result : [];

    return {
      output: {
        items,
        count: items.length
      },
      message: `Found **${items.length}** item(s) in app **${ctx.input.appId}** matching "${ctx.input.searchValue}".`
    };
  })
  .build();
