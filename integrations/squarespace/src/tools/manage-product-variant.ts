import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireSquarespaceString, squarespaceServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageProductVariant = SlateTool.create(spec, {
  name: 'Manage Product Variant',
  key: 'manage_product_variant',
  description: `Create, update, or delete a variant for a Squarespace product. Variant creation requires a SKU and base price; updates use Squarespace v2 change-wrapper fields.`,
  instructions: [
    'For create, provide productId, sku, priceCurrency, and priceValue',
    'For update, provide productId, variantId, and at least one variant field to change',
    'For delete, provide productId and variantId',
    'Physical product variants can include up to six attribute key-value pairs'
  ],
  constraints: ['SKU maximum 60 characters'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      productId: z.string().describe('Product ID that owns the variant'),
      variantId: z.string().optional().describe('Variant ID for update and delete'),
      sku: z.string().optional().describe('Variant SKU'),
      priceCurrency: z.string().optional().describe('ISO 4217 currency code'),
      priceValue: z.string().optional().describe('Base price amount as a string'),
      attributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Variant attribute values, such as size or color'),
      shippingMeasurements: z
        .record(z.string(), z.any())
        .optional()
        .describe('Shipping measurements object for physical product variants')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Action performed'),
      productId: z.string().describe('Product ID'),
      variantId: z.string().optional().describe('Variant ID'),
      variant: z.any().optional().describe('Created or updated variant'),
      deleted: z.boolean().optional().describe('Whether the variant was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let sku = requireSquarespaceString(ctx.input.sku, 'sku', 'create');
      let priceCurrency = requireSquarespaceString(
        ctx.input.priceCurrency,
        'priceCurrency',
        'create'
      );
      let priceValue = requireSquarespaceString(ctx.input.priceValue, 'priceValue', 'create');

      let variant = await client.createVariant(ctx.input.productId, {
        sku,
        pricing: {
          basePrice: {
            currency: priceCurrency,
            value: priceValue
          }
        },
        attributes: ctx.input.attributes,
        shippingMeasurements: ctx.input.shippingMeasurements
      });

      return {
        output: {
          action: 'created',
          productId: ctx.input.productId,
          variantId: variant.id,
          variant
        },
        message: `Created variant **${variant.sku || variant.id}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let variantId = requireSquarespaceString(ctx.input.variantId, 'variantId', 'update');
      let hasUpdates =
        ctx.input.sku !== undefined ||
        ctx.input.priceCurrency !== undefined ||
        ctx.input.priceValue !== undefined ||
        ctx.input.attributes !== undefined ||
        ctx.input.shippingMeasurements !== undefined;

      if (!hasUpdates) {
        throw squarespaceServiceError('At least one variant field is required for "update".');
      }

      if (
        (ctx.input.priceCurrency && !ctx.input.priceValue) ||
        (!ctx.input.priceCurrency && ctx.input.priceValue)
      ) {
        throw squarespaceServiceError(
          'priceCurrency and priceValue must be provided together for variant price updates.'
        );
      }

      let variant = await client.updateVariant(ctx.input.productId, variantId, {
        sku: ctx.input.sku,
        pricing:
          ctx.input.priceCurrency && ctx.input.priceValue
            ? {
                basePrice: {
                  currency: ctx.input.priceCurrency,
                  value: ctx.input.priceValue
                }
              }
            : undefined,
        attributes: ctx.input.attributes,
        shippingMeasurements: ctx.input.shippingMeasurements
      });

      return {
        output: {
          action: 'updated',
          productId: ctx.input.productId,
          variantId: variant.id || variantId,
          variant
        },
        message: `Updated variant **${variant.sku || variant.id || variantId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let variantId = requireSquarespaceString(ctx.input.variantId, 'variantId', 'delete');
      await client.deleteVariant(ctx.input.productId, variantId);

      return {
        output: {
          action: 'deleted',
          productId: ctx.input.productId,
          variantId,
          deleted: true
        },
        message: `Deleted variant **${variantId}**.`
      };
    }

    throw squarespaceServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
