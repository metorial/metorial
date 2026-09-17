import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addOnCurrency = z.looseObject({
  id: z.number().optional().describe('Currency identifier'),
  code: z.string().nullable().optional().describe('ISO currency code, such as USD or EUR'),
  name: z.string().nullable().optional().describe('Currency name'),
  euro_forex: z
    .number()
    .optional()
    .describe('Exchange rate between this currency and the Euro'),
  symbol: z.string().nullable().optional().describe('Currency symbol')
});

let rateAddOn = z.looseObject({
  id: z
    .number()
    .optional()
    .describe(
      'Add-on identifier. This is the value to pass when adding this add-on to a quote'
    ),
  name: z.string().nullable().optional().describe('Name of the add-on'),
  description: z.string().nullable().optional().describe('Description of the add-on'),
  charge_type: z
    .string()
    .nullable()
    .optional()
    .describe('How the add-on is charged, for example as a fixed amount or a percentage'),
  rate_type: z.string().nullable().optional().describe('Rate type the add-on belongs to'),
  max_quantity: z
    .number()
    .nullable()
    .optional()
    .describe(
      'Highest number of units that can be reserved for this add-on. Never request more units than this, and treat null as not charged per unit'
    ),
  frequency: z
    .string()
    .nullable()
    .optional()
    .describe('How often the charge applies, for example per stay or per night'),
  percentage: z
    .number()
    .nullable()
    .optional()
    .describe('Percentage applied when the add-on is charged as a percentage'),
  amount: z.number().nullable().optional().describe('Current price of the add-on'),
  original_amount: z
    .number()
    .nullable()
    .optional()
    .describe('Price before any discount was applied'),
  image_url: z.string().nullable().optional().describe('Image for the add-on'),
  currency: addOnCurrency
    .nullable()
    .optional()
    .describe('Currency the add-on amounts are expressed in')
});

export let listRateAddons = SlateTool.create(spec, {
  name: 'List Rate Add-Ons',
  key: 'list_rate_addons',
  description: `List the add-ons available for a property, such as cleaning, linens, breakfast, or airport transfers, with the identifier, price, and maximum quantity of each. Supplying stay dates and a room type narrows the list to the add-ons that are actually valid for that stay, which is the recommended way to prepare a quote.`,
  instructions: [
    'Call this first to discover add-on identifiers, then pass them to get_quote or create_booking_quote. Those tools accept add-on identifiers but cannot list the available add-ons.',
    'Pass start and end together, and add the room type, to see only the add-ons valid for a specific stay instead of everything the property offers.',
    'Use the id and max_quantity of each add-on to build a valid quote entry; never request more units than max_quantity allows.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The ID of the property to list add-ons for'),
      start: z
        .string()
        .optional()
        .describe(
          'Start date of the stay (YYYY-MM-DD). Must be paired with an end date, and narrows results to add-ons valid for those dates'
        ),
      end: z
        .string()
        .optional()
        .describe(
          'End date of the stay (YYYY-MM-DD). Must be paired with a start date, and narrows results to add-ons valid for those dates'
        ),
      roomTypeId: z
        .number()
        .optional()
        .describe(
          'Room type ID. When provided, returns only the add-ons available for that room'
        )
    })
  )
  .output(
    z.object({
      addOns: z
        .array(rateAddOn)
        .describe(
          'Available add-ons, each with the id and max_quantity needed to build a quote entry'
        ),
      count: z.number().describe('Number of add-ons returned'),
      propertyId: z.number().describe('The property the add-ons belong to'),
      filteredForStay: z
        .boolean()
        .describe(
          'Whether dates or a room type narrowed the results to a specific stay rather than listing everything the property offers'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (Boolean(ctx.input.start) !== Boolean(ctx.input.end)) {
      throw createApiServiceError(
        'Start and end dates must be provided together to filter add-ons by stay dates. Provide both, or omit both to list every add-on for the property.'
      );
    }

    let result = await client.listPropertyAddOns(ctx.input.propertyId, {
      start: ctx.input.start,
      end: ctx.input.end,
      rid: ctx.input.roomTypeId
    });

    let addOns = Array.isArray(result) ? result : [];
    let filteredForStay = Boolean(ctx.input.start || ctx.input.roomTypeId);
    let scopeText = filteredForStay ? ' valid for the requested stay' : '';

    if (addOns.length === 0) {
      return {
        output: {
          addOns,
          count: 0,
          propertyId: ctx.input.propertyId,
          filteredForStay
        },
        message: `No add-ons${scopeText} are available for property **#${ctx.input.propertyId}**.`
      };
    }

    let preview = addOns
      .slice(0, 3)
      .map((addOn: any) => `**${addOn?.name ?? 'Unnamed add-on'}** (ID ${addOn?.id})`)
      .join(', ');
    let moreText = addOns.length > 3 ? `, and ${addOns.length - 3} more` : '';

    return {
      output: {
        addOns,
        count: addOns.length,
        propertyId: ctx.input.propertyId,
        filteredForStay
      },
      message: `Found **${addOns.length}** add-ons${scopeText} for property **#${ctx.input.propertyId}**: ${preview}${moreText}.`
    };
  })
  .build();
