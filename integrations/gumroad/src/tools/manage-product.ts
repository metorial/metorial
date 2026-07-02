import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient, type ProductMutationParams } from '../lib/client';
import { gumroadServiceError } from '../lib/errors';
import { spec } from '../spec';
import { mapProduct, productSchema } from './product-utils';

let mutationFieldNames = [
  'nativeType',
  'name',
  'description',
  'customPermalink',
  'priceCents',
  'currency',
  'subscriptionDuration',
  'customizablePrice',
  'suggestedPriceCents',
  'maxPurchaseCount',
  'quantityEnabled',
  'isAdult',
  'displayProductReviews',
  'shouldShowSalesCount',
  'category',
  'taxonomyId',
  'tags',
  'customReceipt',
  'customSummary',
  'customHtml',
  'coverIds',
  'richContent',
  'files',
  'hasSameRichContentForAllVariants'
] as const;

type ManageProductInput = ProductMutationParams & {
  action: 'create' | 'update' | 'enable' | 'disable' | 'delete';
  productId?: string;
};

let getProductId = (input: ManageProductInput) => {
  if (!input.productId) {
    throw gumroadServiceError(`productId is required for ${input.action} action.`);
  }

  return input.productId;
};

let hasMutationField = (input: ManageProductInput) =>
  mutationFieldNames.some(field => input[field] !== undefined);

let toMutationParams = (input: ManageProductInput): ProductMutationParams => {
  if (input.category && input.taxonomyId !== undefined) {
    throw gumroadServiceError('Send either category or taxonomyId, not both.');
  }

  return Object.fromEntries(
    mutationFieldNames
      .filter(field => input[field] !== undefined)
      .map(field => [field, input[field]])
  ) as ProductMutationParams;
};

export let manageProduct = SlateTool.create(spec, {
  name: 'Manage Product',
  key: 'manage_product',
  description: `Create, update, enable, disable, or delete a Gumroad product. Use this to manage product drafts, metadata, pricing, categorization, and lifecycle.`,
  instructions: [
    'Use "create" with name and priceCents to create a draft product.',
    'Use "update" with productId and only the fields you want to change.',
    'Use either category or taxonomyId, never both.',
    'Use "enable" to publish a product and "disable" to hide it.',
    'Use "delete" to permanently remove a product.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      productId: z
        .string()
        .optional()
        .describe('The product ID. Required for update, enable, disable, and delete.'),
      action: z
        .enum(['create', 'update', 'enable', 'disable', 'delete'])
        .describe('Action to perform on the product'),
      nativeType: z
        .enum([
          'digital',
          'course',
          'ebook',
          'membership',
          'bundle',
          'coffee',
          'call',
          'commission'
        ])
        .optional()
        .describe('Product type for create. Cannot be changed later.'),
      name: z.string().optional().describe('Product name. Required for create.'),
      description: z.string().optional().describe('Product description as HTML'),
      customPermalink: z.string().optional().describe('Custom URL slug'),
      priceCents: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Price in the smallest currency unit. Required for create.'),
      currency: z.string().optional().describe('ISO currency code'),
      subscriptionDuration: z
        .enum(['monthly', 'quarterly', 'biannually', 'yearly', 'every_two_years'])
        .optional()
        .describe('Membership billing interval'),
      customizablePrice: z.boolean().optional().describe('Enable pay-what-you-want pricing'),
      suggestedPriceCents: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Suggested pay-what-you-want price in cents'),
      maxPurchaseCount: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Maximum purchases allowed'),
      quantityEnabled: z.boolean().optional().describe('Whether buyers can set quantity'),
      isAdult: z.boolean().optional().describe('Whether the product is adult content'),
      displayProductReviews: z
        .boolean()
        .optional()
        .describe('Whether to display product reviews'),
      shouldShowSalesCount: z
        .boolean()
        .optional()
        .describe('Whether to show the product sales count'),
      category: z
        .string()
        .optional()
        .describe('Full category path from list_categories. Cannot be sent with taxonomyId.'),
      taxonomyId: z
        .number()
        .int()
        .optional()
        .describe('Numeric category ID from list_categories. Cannot be sent with category.'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Product tags. Full replacement on update.'),
      customReceipt: z.string().optional().describe('Custom receipt text'),
      customSummary: z.string().optional().describe('Custom summary shown to buyers'),
      customHtml: z.string().optional().describe('Custom landing page HTML'),
      coverIds: z
        .array(z.string())
        .optional()
        .describe('Cover IDs to attach or reorder. Full replacement on update.'),
      richContent: z
        .array(z.any())
        .optional()
        .describe('Rich content pages. Full replacement on update.'),
      files: z
        .array(z.any())
        .optional()
        .describe('Files to attach. Full replacement on update.'),
      hasSameRichContentForAllVariants: z
        .boolean()
        .optional()
        .describe('Whether all variants share product-level rich content')
    })
  )
  .output(
    z.object({
      product: productSchema.optional().describe('Managed product details'),
      productId: z.string().optional().describe('The managed product ID'),
      deleted: z.boolean().optional().describe('Whether the product was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let input = ctx.input as ManageProductInput;
    let { action } = input;

    if (action === 'create') {
      if (!input.name) throw gumroadServiceError('name is required for create action.');
      if (input.priceCents === undefined)
        throw gumroadServiceError('priceCents is required for create action.');

      let product = await client.createProduct(toMutationParams(input));
      return {
        output: { product: mapProduct(product), productId: product.id },
        message: `Created draft product **${product.name || product.id}**.`
      };
    }

    if (action === 'update') {
      let productId = getProductId(input);
      if (!hasMutationField(input)) {
        throw gumroadServiceError('At least one product field is required for update action.');
      }

      let product = await client.updateProduct(productId, toMutationParams(input));
      return {
        output: { product: mapProduct(product), productId: product.id || productId },
        message: `Updated product **${product.name || productId}**.`
      };
    }

    let productId = getProductId(input);

    if (action === 'delete') {
      await client.deleteProduct(productId);
      return {
        output: { productId, deleted: true },
        message: `Product **${productId}** has been deleted.`
      };
    }

    let product: any;
    if (action === 'enable') {
      product = await client.enableProduct(productId);
    } else if (action === 'disable') {
      product = await client.disableProduct(productId);
    } else {
      throw gumroadServiceError(`Unknown action: ${action}`);
    }

    return {
      output: {
        product: mapProduct(product),
        productId: product.id || productId
      },
      message: `Product **${product.name || productId}** has been ${action}d.`
    };
  })
  .build();
