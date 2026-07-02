import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let pricingPersonSchema = z
  .object({
    type: z.string().describe('Person type identifier'),
    name: z.string().describe('Display name (e.g., Adult, Child)'),
    ageFrom: z.number().optional().describe('Minimum age'),
    ageTo: z.number().optional().describe('Maximum age'),
    price: z.number().describe('Current price'),
    originalPrice: z.number().describe('Original price before discount')
  })
  .passthrough();

let pricingGroupSchema = z
  .object({
    size: z.number().describe('Group size'),
    price: z.number().describe('Current price for the group'),
    originalPrice: z.number().describe('Original price before discount')
  })
  .passthrough();

let inventoryItemSchema = z
  .object({
    inventoryId: z.string().describe('Inventory slot identifier (used for booking)'),
    startDateTime: z.string().describe('Start date and time (ISO 8601 local)'),
    endDateTime: z.string().describe('End date and time (ISO 8601 local)'),
    availability: z.string().describe('Availability status: LIMITED, UNLIMITED, or CLOSED'),
    remaining: z.number().optional().describe('Number of remaining spots'),
    pricing: z
      .object({
        persons: z
          .array(pricingPersonSchema)
          .optional()
          .describe('Per-person pricing (when priceType is PER_PERSON)'),
        groups: z
          .array(pricingGroupSchema)
          .optional()
          .describe('Per-group pricing (when priceType is PER_GROUP)')
      })
      .optional()
      .describe('Pricing details for this time slot')
  })
  .passthrough();

export let getInventory = SlateTool.create(spec, {
  name: 'Get Inventory & Pricing',
  key: 'get_inventory',
  description: `Fetch real-time inventory and pricing for a specific product variant. Returns available dates, times, remaining capacity, and per-person or per-group pricing.
Use this before creating a booking to find available time slots and accurate prices.`,
  instructions: [
    'Get the variantId from the "Get Product Details" tool.',
    'By default returns inventory for the next 30 days. Use startDateTime/endDateTime to customize the range (max ~90 days out).',
    'Date format is ISO 8601 local time: YYYY-MM-DDThh:mm:ss.',
    'Inventory is volatile — refresh frequently before booking to avoid stale data.'
  ],
  constraints: ['Active inventory is maintained for approximately 90 days per product.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      variantId: z.string().describe('Product variant ID to check inventory for'),
      startDateTime: z
        .string()
        .optional()
        .describe('Start of date range (YYYY-MM-DDThh:mm:ss). Defaults to current time.'),
      endDateTime: z
        .string()
        .optional()
        .describe('End of date range (YYYY-MM-DDThh:mm:ss). Defaults to 30 days from start.'),
      currencyCode: z.string().optional().describe('Override currency for pricing (ISO 4217)'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Number of inventory slots per page')
    })
  )
  .output(
    z.object({
      inventoryItems: z.array(inventoryItemSchema).describe('Available inventory slots'),
      total: z.number().optional().describe('Total number of inventory slots'),
      nextOffset: z.number().optional().describe('Offset for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment,
      languageCode: ctx.config.languageCode,
      currencyCode: ctx.config.currencyCode
    });

    let result = await client.getInventory(ctx.input.variantId, {
      startDateTime: ctx.input.startDateTime,
      endDateTime: ctx.input.endDateTime,
      currencyCode: ctx.input.currencyCode,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let inventoryItems = (result.items ?? []).map((item: any) => ({
      inventoryId: String(item.id ?? item.inventoryId ?? ''),
      startDateTime: item.startDateTime,
      endDateTime: item.endDateTime,
      availability: item.availability,
      remaining: item.remaining,
      pricing: item.pricing
    }));

    let availableCount = inventoryItems.filter((i: any) => i.availability !== 'CLOSED').length;

    return {
      output: {
        inventoryItems,
        total: result.total,
        nextOffset: result.nextOffset
      },
      message: `Found ${result.total ?? inventoryItems.length} inventory slots for variant **${ctx.input.variantId}**. ${availableCount} slot${availableCount !== 1 ? 's are' : ' is'} available.`
    };
  })
  .build();
