import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

let offerCodeSchema = z.object({
  offerCodeId: z.string().describe('Unique offer code ID'),
  name: z.string().describe('Offer code name/code string'),
  amountOff: z
    .number()
    .optional()
    .describe('Discount amount (cents or percentage based on type)'),
  offerType: z
    .string()
    .optional()
    .describe('Type of discount: "cents" for fixed amount, "percent" for percentage'),
  maxPurchaseCount: z.number().optional().describe('Maximum number of uses (0 = unlimited)'),
  universal: z.boolean().optional().describe('Whether the code applies to all products')
});

export let manageOfferCodes = SlateTool.create(spec, {
  name: 'Manage Offer Codes',
  key: 'manage_offer_codes',
  description: `List, create, update, or delete discount offer codes for a Gumroad product. Offer codes can be fixed-amount or percentage-based discounts with optional usage limits.`,
  instructions: [
    'When creating, set offerType to "cents" for a fixed-amount discount or "percent" for percentage off.',
    'Set maxPurchaseCount to 0 for unlimited uses.',
    'Only maxPurchaseCount can be updated after creation.'
  ],
  tags: {
    destructive: false
  }
})
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
      name: z.string().optional().describe('Offer code name (required for create)'),
      amountOff: z
        .number()
        .optional()
        .describe('Discount amount in cents or percentage (required for create)'),
      offerType: z
        .enum(['cents', 'percent'])
        .optional()
        .describe('Discount type (default: "cents")'),
      maxPurchaseCount: z.number().optional().describe('Maximum uses (0 = unlimited)'),
      universal: z.boolean().optional().describe('Whether the code applies to all products')
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
      let mapped = codes.map((c: any) => ({
        offerCodeId: c.id,
        name: c.name || '',
        amountOff: c.amount_off,
        offerType: c.offer_type,
        maxPurchaseCount: c.max_purchase_count,
        universal: c.universal
      }));
      return {
        output: { offerCodes: mapped },
        message: `Found **${mapped.length}** offer code(s) for product ${productId}.`
      };
    }

    if (action === 'get') {
      if (!offerCodeId) throw new Error('offerCodeId is required for get action');
      let code = await client.getOfferCode(productId, offerCodeId);
      return {
        output: {
          offerCode: {
            offerCodeId: code.id,
            name: code.name || '',
            amountOff: code.amount_off,
            offerType: code.offer_type,
            maxPurchaseCount: code.max_purchase_count,
            universal: code.universal
          }
        },
        message: `Retrieved offer code **${code.name}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (ctx.input.amountOff === undefined)
        throw new Error('amountOff is required for create action');
      let code = await client.createOfferCode(productId, {
        name: ctx.input.name,
        amountOff: ctx.input.amountOff,
        offerType: ctx.input.offerType,
        maxPurchaseCount: ctx.input.maxPurchaseCount,
        universal: ctx.input.universal
      });
      return {
        output: {
          offerCode: {
            offerCodeId: code.id,
            name: code.name || '',
            amountOff: code.amount_off,
            offerType: code.offer_type,
            maxPurchaseCount: code.max_purchase_count,
            universal: code.universal
          }
        },
        message: `Created offer code **${code.name}**.`
      };
    }

    if (action === 'update') {
      if (!offerCodeId) throw new Error('offerCodeId is required for update action');
      let code = await client.updateOfferCode(productId, offerCodeId, {
        maxPurchaseCount: ctx.input.maxPurchaseCount
      });
      return {
        output: {
          offerCode: {
            offerCodeId: code.id,
            name: code.name || '',
            amountOff: code.amount_off,
            offerType: code.offer_type,
            maxPurchaseCount: code.max_purchase_count,
            universal: code.universal
          }
        },
        message: `Updated offer code **${code.name}**.`
      };
    }

    if (action === 'delete') {
      if (!offerCodeId) throw new Error('offerCodeId is required for delete action');
      await client.deleteOfferCode(productId, offerCodeId);
      return {
        output: { deleted: true },
        message: `Deleted offer code **${offerCodeId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
