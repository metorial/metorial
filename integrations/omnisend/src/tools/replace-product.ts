import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';
import { productInputSchema, variantSchema } from './manage-product';

export let replaceProduct = SlateTool.create(spec, {
  name: 'Replace Product',
  key: 'replace_product',
  description:
    'Replace an existing catalog product completely using PUT. Supply the full intended product and all variants; omitted optional fields and variants can be removed. Prices remain currency-unit amounts, with no cents conversion.',
  instructions: [
    'Read the product first and preserve every field and variant you intend to keep.'
  ],
  tags: { destructive: true, readOnly: false }
})
  .input(
    productInputSchema.extend({
      updatedAt: z
        .string()
        .optional()
        .describe(
          'Product update timestamp to preserve in the full replacement, in RFC3339 format'
        ),
      variants: z
        .array(variantSchema)
        .describe('Complete replacement variants; include every variant to retain')
    })
  )
  .output(
    z.object({
      productId: z.string().describe('Verified product ID'),
      title: z.string().optional(),
      url: z.string().optional(),
      currency: z.string().optional(),
      status: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let { productId, variants, categoryIds, ...fields } = ctx.input;
    let output = await new OmnisendClient(ctx.auth, ctx.config.apiVersion).updateProduct(
      productId,
      {
        ...fields,
        id: productId,
        categoryIDs: categoryIds,
        variants: variants.map(({ variantId, ...variant }) => ({ ...variant, id: variantId }))
      }
    );
    return { output, message: 'Product replaced and read back.' };
  })
  .build();
