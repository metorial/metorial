import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type RangedRate } from '../lib/client';
import { spec } from '../spec';

let datePattern = /^\d{4}-\d{2}-\d{2}/;
let minDailyRate = 1;
let maxDailyRate = 100000000000;

export let updateRates = SlateTool.create(spec, {
  name: 'Update Rates',
  key: 'update_rates',
  description: `Set nightly pricing for a specific room type at a property. Each entry prices a date range or acts as the default rate, and can carry minimum/maximum stay limits and an additional-guest charge. Pricing is nightly only; there are no weekly or monthly price fields.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'At least one date range with a daily rate is required.',
    'endDate is exclusive: a range from 2024-01-01 to 2024-01-07 prices the nights of Jan 1 through Jan 6. Consecutive periods therefore share that boundary date, with one period starting on the endDate of the previous one. This is the opposite of get_rates, where endDate is the last night included.',
    'dailyRate must be at least 1. A rate of 0 is rejected — to stop selling nights, set their available unit count to 0 with update_availability instead.',
    'Date ranges must not overlap, including ranges that differ only by minStay or maxStay.',
    'isDefault marks the fallback rate used on nights with no date-specific rate. A default rate must not carry startDate or endDate, and a dated range must not set isDefault.',
    'Pricing is per night. Weekly and monthly prices cannot be stored; express them as a nightly rate and use minStay/maxStay to restrict which stay lengths it applies to.',
    'If the provider rejects the update because a minimum stay is required, set minStay on the affected ranges and retry.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The property/house ID'),
      roomTypeId: z.number().describe('The room type ID to update rates for'),
      dateRanges: z
        .array(
          z.object({
            startDate: z
              .string()
              .optional()
              .describe(
                'First night the rate applies to, inclusive (YYYY-MM-DD). Required unless isDefault is set, and must be omitted when it is'
              ),
            endDate: z
              .string()
              .optional()
              .describe(
                'End of the rate period, exclusive — the rate does not apply to this night itself (YYYY-MM-DD). Required unless isDefault is set, and must be omitted when it is'
              ),
            dailyRate: z
              .number()
              .describe('Nightly rate amount, must be at least 1 (a rate of 0 is rejected)'),
            weeklyRate: z
              .number()
              .optional()
              .describe(
                'Not supported. Pricing is nightly only, so setting this fails with an explanation instead of quietly ignoring it. Convert the weekly price to a nightly rate and use minStay instead'
              ),
            monthlyRate: z
              .number()
              .optional()
              .describe(
                'Not supported. Pricing is nightly only, so setting this fails with an explanation instead of quietly ignoring it. Convert the monthly price to a nightly rate and use minStay instead'
              ),
            minStay: z
              .number()
              .optional()
              .describe('Minimum number of nights a guest must stay for this rate to apply'),
            maxStay: z
              .number()
              .optional()
              .describe('Maximum number of nights a guest can stay for this rate to apply'),
            pricePerAdditionalGuest: z
              .number()
              .optional()
              .describe('Extra nightly charge per guest beyond additionalGuestsStartsFrom'),
            additionalGuestsStartsFrom: z
              .number()
              .optional()
              .describe(
                'Guest count at which the additional-guest charge starts to apply. Set to 3 to charge from the 3rd guest onwards'
              ),
            isDefault: z
              .boolean()
              .optional()
              .describe(
                'Make this the default rate, used on nights that have no date-specific rate. Mutually exclusive with startDate and endDate'
              )
          })
        )
        .min(1)
        .describe('Rate periods to set')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe(
          'The confirmation the provider returned for the save. True only when it confirmed the rates were stored'
        ),
      rangesSubmitted: z.number().describe('Number of rate periods sent in this request'),
      propertyId: z.number().describe('The property/house ID the rates were sent for'),
      roomTypeId: z.number().describe('The room type ID the rates were sent for')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let rates: RangedRate[] = [];
    let datedRanges: Array<{ label: string; start: string; end: string }> = [];

    for (let [index, range] of ctx.input.dateRanges.entries()) {
      let label = `dateRanges[${index}]`;

      if (range.weeklyRate !== undefined || range.monthlyRate !== undefined) {
        throw createApiServiceError(
          `${label} sets weeklyRate or monthlyRate, which Lodgify cannot store. The rate model prices rooms per night only — the only amounts it accepts are a price per night and an extra charge per additional guest. Convert the weekly or monthly price to a nightly rate and use minStay (and maxStay) to restrict it to longer stays.`
        );
      }

      if (range.isDefault) {
        if (range.startDate !== undefined || range.endDate !== undefined) {
          throw createApiServiceError(
            `${label} sets isDefault together with a date range. A default rate applies to nights that have no date-specific rate, so it must not carry startDate or endDate. Either drop the dates or drop isDefault.`
          );
        }
      } else if (range.startDate === undefined || range.endDate === undefined) {
        throw createApiServiceError(
          `${label} is missing startDate or endDate. Every rate period needs both dates unless it sets isDefault.`
        );
      }

      if (range.dailyRate < minDailyRate) {
        throw createApiServiceError(
          `${label} has a dailyRate of ${range.dailyRate}. Nightly prices must be at least ${minDailyRate}, so a rate of 0 cannot be saved. To stop selling those nights, set their available unit count to 0 with update_availability instead.`
        );
      }

      if (range.dailyRate > maxDailyRate) {
        throw createApiServiceError(
          `${label} has a dailyRate of ${range.dailyRate}, above the maximum accepted nightly price of ${maxDailyRate}.`
        );
      }

      if (range.startDate !== undefined && !datePattern.test(range.startDate)) {
        throw createApiServiceError(
          `${label} has startDate "${range.startDate}", which is not a YYYY-MM-DD calendar date.`
        );
      }

      if (range.endDate !== undefined && !datePattern.test(range.endDate)) {
        throw createApiServiceError(
          `${label} has endDate "${range.endDate}", which is not a YYYY-MM-DD calendar date.`
        );
      }

      if (range.startDate !== undefined && range.endDate !== undefined) {
        let start = range.startDate.slice(0, 10);
        let end = range.endDate.slice(0, 10);

        if (start >= end) {
          throw createApiServiceError(
            `${label} covers no nights: startDate ${start} is not before endDate ${end}. endDate is exclusive, so a single night of ${start} needs endDate set to the following day.`
          );
        }

        datedRanges.push({ label, start, end });
      }

      rates.push({
        is_default: range.isDefault,
        start_date: range.startDate,
        end_date: range.endDate,
        price_per_day: range.dailyRate,
        min_stay: range.minStay,
        max_stay: range.maxStay,
        price_per_additional_guest: range.pricePerAdditionalGuest,
        additional_guests_starts_from: range.additionalGuestsStartsFrom
      });
    }

    for (let [index, left] of datedRanges.entries()) {
      for (let right of datedRanges.slice(index + 1)) {
        if (left.start < right.end && right.start < left.end) {
          throw createApiServiceError(
            `${left.label} (${left.start} to ${left.end}) overlaps ${right.label} (${right.start} to ${right.end}). Rate periods must not overlap, even when they differ only by minStay or maxStay. endDate is exclusive, so consecutive periods should share that boundary date rather than repeat a night.`
          );
        }
      }
    }

    let result = await client.saveRates({
      property_id: ctx.input.propertyId,
      room_type_id: ctx.input.roomTypeId,
      rates
    });

    let success = result === true || result === 'true';

    return {
      output: {
        success,
        rangesSubmitted: rates.length,
        propertyId: ctx.input.propertyId,
        roomTypeId: ctx.input.roomTypeId
      },
      message: success
        ? `Saved **${rates.length}** rate period(s) for room type **#${ctx.input.roomTypeId}** at property **#${ctx.input.propertyId}**.`
        : `Sent **${rates.length}** rate period(s) for room type **#${ctx.input.roomTypeId}** at property **#${ctx.input.propertyId}**, but the provider did not confirm the save. Re-check the rates with get_rates before relying on them.`
    };
  })
  .build();
