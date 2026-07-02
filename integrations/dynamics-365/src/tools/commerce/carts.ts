import { commerceCartOperationInputSchema } from '@slates/dynamics-commerce-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import {
  buildDocumentedAddCartLinesRequest,
  buildDocumentedCheckoutCartRequest,
  buildDocumentedUpdateCartLinesRequest
} from './retail-server-requests';
import {
  assertPrimitiveAdditionalFields,
  buildCommerceToolOutput,
  commerceMessage,
  commerceResultOutputSchema,
  createCommerceClient,
  requireConfirmedWrite,
  withCommerceDefaults
} from './shared';

let cartInputSchema = commerceCartOperationInputSchema.extend({
  confirmWrite: z
    .boolean()
    .optional()
    .describe('Must be true for cart create, line, discount, or checkout actions.'),
  cartVersion: z
    .number()
    .int()
    .optional()
    .describe(
      'For add_lines, update_lines, or checkout, optional Commerce cart version concurrency value.'
    ),
  receiptNumberSequence: z
    .string()
    .optional()
    .describe('For checkout, optional Commerce receipt number sequence.')
});

let readActions = new Set(['get', 'get_promotions']);

export let manageCarts = SlateTool.create(spec, {
  name: 'Manage Commerce Carts',
  key: 'manage_carts',
  description:
    'Create, retrieve, and update Dynamics 365 Commerce carts, including cart lines, discount codes, promotions, and checkout through Retail Server cart APIs.',
  constraints: [
    'Cart create, line, discount, and checkout actions require confirmWrite=true.',
    'Checkout can create transactional Commerce records and should only be used against the intended cart.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(cartInputSchema)
  .output(commerceResultOutputSchema)
  .handleInvocation(async ctx => {
    if (!readActions.has(ctx.input.action)) {
      requireConfirmedWrite(ctx.input.confirmWrite, ctx.input.action, 'carts');
      assertPrimitiveAdditionalFields(ctx.input.additionalFields);
    }

    let client = createCommerceClient(ctx);
    let input = withCommerceDefaults(ctx, ctx.input);
    let result: unknown;
    let collection = false;

    switch (input.action) {
      case 'create':
        result = await client.createCart(input);
        break;
      case 'get':
        result = await client.getCart(input as any);
        break;
      case 'add_lines':
        result = await client.execute(buildDocumentedAddCartLinesRequest(input as any));
        break;
      case 'update_lines':
        result = await client.execute(buildDocumentedUpdateCartLinesRequest(input as any));
        break;
      case 'remove_lines':
        result = await client.removeCartLines(input as any);
        break;
      case 'add_discount_code':
        result = await client.addCartDiscountCode(input as any);
        break;
      case 'remove_discount_codes':
        result = await client.removeCartDiscountCodes(input as any);
        break;
      case 'checkout':
        result = await client.execute(buildDocumentedCheckoutCartRequest(input as any));
        break;
      case 'get_promotions':
        result = await client.getCartPromotions(input as any);
        collection = true;
        break;
    }

    let output = buildCommerceToolOutput(input.action, result, {
      collection,
      pageInput: collection ? input : undefined
    });

    return {
      output,
      message: commerceMessage('Commerce carts', input.action, output)
    };
  })
  .build();
