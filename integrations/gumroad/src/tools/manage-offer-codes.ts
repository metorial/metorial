import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { gumroadServiceError } from '../lib/errors';
import { gumroadActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let offerCodeSchema = z.object({
  offerCodeId: z.string().describe('Unique offer code ID'),
  name: z.string().describe('Offer code name/code string'),
  amountOff: z
    .number()
    .optional()
    .describe('Discount amount: cents for "cents" codes, percentage for "percent" codes'),
  offerType: z
    .string()
    .optional()
    .describe('Type of discount: "cents" for fixed amount, "percent" for percentage'),
  maxPurchaseCount: z
    .number()
    .optional()
    .describe('Maximum number of uses. Absent when the code has no usage limit.'),
  minimumAmountCents: z
    .number()
    .optional()
    .describe('Minimum order total in cents required for the code to apply'),
  timesUsed: z.number().optional().describe('Number of times the code has been redeemed'),
  universal: z.boolean().optional().describe('Whether the code applies to all products')
});

let mapOfferCode = (code: any) => {
  let isPercent = typeof code.percent_off === 'number';
  let amountOff = isPercent ? code.percent_off : code.amount_cents;

  return {
    offerCodeId: code.id,
    name: code.name || '',
    amountOff: typeof amountOff === 'number' ? amountOff : undefined,
    offerType: isPercent
      ? 'percent'
      : typeof code.amount_cents === 'number'
        ? 'cents'
        : undefined,
    maxPurchaseCount: code.max_purchase_count ?? undefined,
    minimumAmountCents: code.minimum_amount_cents ?? undefined,
    timesUsed: code.times_used ?? undefined,
    universal: code.universal
  };
};

export let manageOfferCodes = SlateTool.create(spec, {
  name: 'Manage Offer Codes',
  key: 'manage_offer_codes',
  description: `List, create, update, or delete discount offer codes for a Gumroad product. Offer codes can be fixed-amount or percentage-based discounts with optional usage limits and minimum order totals.`,
  instructions: [
    'When creating, set offerType to "cents" for a fixed-amount discount or "percent" for percentage off.',
    'Omit maxPurchaseCount on create for unlimited uses; a value of 0 makes the code unusable. An existing limit cannot be cleared back to unlimited.',
    'Only maxPurchaseCount and minimumAmountCents can be updated after creation.'
  ],
  tags: {
    destructive: false
  }
})
  .scopes(gumroadActionScopes.editProducts)
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      productId: z.string().describe('The product ID the offer code belongs to'),
      offerCodeId: z
        .string()
        .optional()
        .describe('Offer code ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Code buyers enter at checkout (required for create)'),
      amountOff: z
        .number()
        .optional()
        .describe(
          'Discount amount: cents for "cents" codes, whole percentage for "percent" codes (required for create)'
        ),
      offerType: z
        .enum(['cents', 'percent'])
        .optional()
        .describe('Discount type (default: "cents")'),
      maxPurchaseCount: z
        .number()
        .optional()
        .describe(
          'Maximum number of uses (for create, update). Omit on create for unlimited; omitting on update keeps the current limit.'
        ),
      minimumAmountCents: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe(
          'Minimum order total in cents required for the code to apply (for create, update)'
        ),
      universal: z
        .boolean()
        .optional()
        .describe('Whether the code applies to all products (for create)')
    })
  )
  .output(
    z.object({
      offerCode: offerCodeSchema
        .optional()
        .describe('Single offer code (for get, create, update)'),
      offerCodes: z
        .array(offerCodeSchema)
        .optional()
        .describe('List of offer codes (for list)'),
      deleted: z.boolean().optional().describe('Whether the offer code was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let { action, productId, offerCodeId } = ctx.input;

    if (action === 'list') {
      let codes = await client.listOfferCodes(productId);
      let mapped = codes.map(mapOfferCode);
      return {
        output: { offerCodes: mapped },
        message: `Found **${mapped.length}** offer code(s) for product ${productId}.`
      };
    }

    if (action === 'get') {
      if (!offerCodeId) throw gumroadServiceError('offerCodeId is required for get action.');
      let code = await client.getOfferCode(productId, offerCodeId);
      return {
        output: { offerCode: mapOfferCode(code) },
        message: `Retrieved offer code **${code.name}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw gumroadServiceError('name is required for create action.');
      if (ctx.input.amountOff === undefined)
        throw gumroadServiceError('amountOff is required for create action.');
      let code = await client.createOfferCode(productId, {
        name: ctx.input.name,
        amountOff: ctx.input.amountOff,
        offerType: ctx.input.offerType,
        maxPurchaseCount: ctx.input.maxPurchaseCount,
        minimumAmountCents: ctx.input.minimumAmountCents,
        universal: ctx.input.universal
      });
      return {
        output: { offerCode: mapOfferCode(code) },
        message: `Created offer code **${code.name}**.`
      };
    }

    if (action === 'update') {
      if (!offerCodeId)
        throw gumroadServiceError('offerCodeId is required for update action.');
      if (
        ctx.input.maxPurchaseCount === undefined &&
        ctx.input.minimumAmountCents === undefined
      ) {
        throw gumroadServiceError(
          'maxPurchaseCount or minimumAmountCents is required for update action.'
        );
      }
      let code = await client.updateOfferCode(productId, offerCodeId, {
        maxPurchaseCount: ctx.input.maxPurchaseCount,
        minimumAmountCents: ctx.input.minimumAmountCents
      });
      return {
        output: { offerCode: mapOfferCode(code) },
        message: `Updated offer code **${code.name}**.`
      };
    }

    if (action === 'delete') {
      if (!offerCodeId)
        throw gumroadServiceError('offerCodeId is required for delete action.');
      await client.deleteOfferCode(productId, offerCodeId);
      return {
        output: { deleted: true },
        message: `Deleted offer code **${offerCodeId}**.`
      };
    }

    throw gumroadServiceError(`Unknown action: ${action}`);
  })
  .build();
