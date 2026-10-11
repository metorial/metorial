import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { mapVariant, variantSchema } from '../lib/items';
import { spec } from '../spec';

export let listVariants = SlateTool.create(spec, {
  name: 'List Variants',
  key: 'list_variants',
  description: `Retrieve item variants (the sellable units of items, each with its own SKU, barcode, and price). Filter by SKU to look up a product code, or by item IDs, variant IDs, and created/updated time. Variant IDs are needed for receipts and inventory updates.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of variants to return (1-250, default 50)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      sku: z.string().optional().describe('Only return the variant with this SKU'),
      itemIds: z.array(z.string()).optional().describe('Only return variants of these items'),
      variantIds: z
        .array(z.string())
        .optional()
        .describe('Only return variants with these IDs'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Filter variants created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Filter variants created at or before this ISO 8601 UTC timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Filter variants updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Filter variants updated at or before this ISO 8601 UTC timestamp'),
      showDeleted: z.boolean().optional().describe('Include deleted variants')
    })
  )
  .output(
    z.object({
      variants: z.array(variantSchema).describe('List of variants'),
      cursor: z.string().nullable().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listVariants({
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      sku: ctx.input.sku,
      itemIds: joinIds(ctx.input.itemIds),
      variantIds: joinIds(ctx.input.variantIds),
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      showDeleted: ctx.input.showDeleted
    });

    let variants = (result.variants ?? []).map(mapVariant);

    return {
      output: { variants, cursor: result.cursor },
      message: `Retrieved **${variants.length}** variant(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();
