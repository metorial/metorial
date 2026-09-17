import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRates = SlateTool.create(spec, {
  name: 'Get Rates',
  key: 'get_rates',
  description: `Retrieve the nightly rates calendar for a specific room type and date range. Returns one calendar entry per night with its price per night, minimum and maximum stay, and additional-guest pricing. Can also fetch the property's rate settings, which carry the currency, VAT, fees, taxes and promotions.`,
  instructions: [
    'Dates are in YYYY-MM-DD format.',
    'endDate is inclusive: the calendar covers the night of endDate as well.',
    'propertyId, roomTypeId, startDate and endDate are all required. Room type IDs come from list_properties or get_property.',
    'Nightly prices carry no currency of their own. The currency comes from the rate settings that the response embeds.',
    'Use update_rates to change any of these prices.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The property/house ID'),
      roomTypeId: z.number().describe('The room type ID to get rates for'),
      startDate: z.string().describe('First night of the calendar, inclusive (YYYY-MM-DD)'),
      endDate: z
        .string()
        .describe(
          'Last night of the calendar, inclusive — the night of this date is included (YYYY-MM-DD)'
        ),
      includeSettings: z
        .boolean()
        .optional()
        .describe(
          'Also return the property rate settings as a separate rateSettings field. The calendar response already embeds the same settings, so this is only needed when you want them on their own'
        )
    })
  )
  .output(
    z.object({
      dailyRates: z
        .any()
        .describe(
          'The nightly rates calendar as returned by the provider: an object with a calendar_items array (one entry per night) and an embedded rate_settings object'
        ),
      calendarItems: z
        .array(z.record(z.string(), z.any()))
        .describe(
          'The calendar_items entries, one per night. Each has date, is_default, and a prices array whose entries carry min_stay, max_stay, additional_guests_starts_from, price_per_day and price_per_additional_guest. The two price fields are decimal amounts sent as plain JSON numbers (for example 123.45) and carry no currency of their own'
        ),
      currencyCode: z
        .string()
        .optional()
        .describe(
          'Currency the calendar prices are expressed in, read from the rate settings embedded in the response. Omitted when the provider does not return one'
        ),
      rateSettings: z
        .any()
        .optional()
        .describe(
          'Rate settings for the property, returned only when includeSettings is set. Includes currency_code, VAT handling, booking window, advance notice, fees, taxes and promotions'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let dailyRates = await client.getRatesCalendar({
      houseId: ctx.input.propertyId,
      roomTypeId: ctx.input.roomTypeId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    let calendarItems = Array.isArray(dailyRates?.calendar_items)
      ? dailyRates.calendar_items
      : [];
    let currency = dailyRates?.rate_settings?.currency_code;
    let currencyCode = typeof currency === 'string' ? currency : undefined;

    let rateSettings: any;
    if (ctx.input.includeSettings) {
      rateSettings = await client.getRateSettings(ctx.input.propertyId);
    }

    return {
      output: { dailyRates, calendarItems, currencyCode, rateSettings },
      message: `Retrieved **${calendarItems.length}** night(s) of rates for room type **#${ctx.input.roomTypeId}** at property **#${ctx.input.propertyId}** from ${ctx.input.startDate} to ${ctx.input.endDate} (inclusive).`
    };
  })
  .build();
