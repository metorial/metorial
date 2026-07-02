import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSupplementsTool = SlateTool.create(spec, {
  name: 'Get Supplements',
  key: 'get_supplements',
  description: `Retrieve supplements from AccuLynx. List all supplements or get details for a specific supplement including its line items and notations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      supplementId: z
        .string()
        .optional()
        .describe('Specific supplement ID to retrieve details for'),
      includeItems: z
        .boolean()
        .optional()
        .describe('Include supplement line items (requires supplementId)'),
      includeNotations: z
        .boolean()
        .optional()
        .describe('Include supplement notations (requires supplementId)'),
      pageSize: z.number().optional().describe('Number of items per page (for listing)'),
      pageStartIndex: z
        .number()
        .optional()
        .describe('Index of the first element to return (for listing)')
    })
  )
  .output(
    z.object({
      supplement: z.record(z.string(), z.any()).optional().describe('Supplement details'),
      supplements: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Array of supplement objects'),
      items: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Supplement line items'),
      notations: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Supplement notations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.supplementId) {
      let supplement = await client.getSupplement(ctx.input.supplementId);
      let items: any[] | undefined;
      let notations: any[] | undefined;

      if (ctx.input.includeItems) {
        try {
          let result = await client.getSupplementItems(ctx.input.supplementId);
          items = Array.isArray(result) ? result : (result?.items ?? result?.data ?? []);
        } catch (_e) {
          items = [];
        }
      }

      if (ctx.input.includeNotations) {
        try {
          let result = await client.getSupplementNotations(ctx.input.supplementId);
          notations = Array.isArray(result) ? result : (result?.items ?? result?.data ?? []);
        } catch (_e) {
          notations = [];
        }
      }

      return {
        output: { supplement, items, notations },
        message: `Retrieved supplement **${ctx.input.supplementId}**${items ? ` with ${items.length} item(s)` : ''}${notations ? ` and ${notations.length} notation(s)` : ''}.`
      };
    }

    let result = await client.getSupplements({
      pageSize: ctx.input.pageSize,
      pageStartIndex: ctx.input.pageStartIndex
    });
    let supplements = Array.isArray(result)
      ? result
      : (result?.items ?? result?.data ?? [result]);

    return {
      output: { supplements },
      message: `Retrieved **${supplements.length}** supplement(s).`
    };
  })
  .build();
