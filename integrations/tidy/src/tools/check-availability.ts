import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bookingEndTime, formatTidyDateTime } from '../lib/format';
import { spec } from '../spec';

export let checkBookingAvailability = SlateTool.create(spec, {
  name: 'Check Booking Availability',
  key: 'check_booking_availability',
  description: `Query available time slots for booking a job at a specific address. Returns availability for the next 4 weeks. Use this before creating a job to find a suitable time window.`,
  instructions: [
    'Common service type keys: `regular_cleaning.one_hour`, `regular_cleaning.two_and_a_half_hours`, `regular_cleaning.four_hours`.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z.string().describe('ID of the address to check availability for'),
      serviceTypeKey: z
        .string()
        .describe('Service type key (e.g. "regular_cleaning.one_hour")')
    })
  )
  .output(
    z.object({
      availabilities: z
        .array(
          z.object({
            startTime: z.string().describe('Start time of the available slot'),
            endTime: z
              .string()
              .describe('End time calculated from the service duration; empty if unavailable'),
            date: z
              .string()
              .optional()
              .describe('Available date in the property local time zone'),
            time: z
              .string()
              .optional()
              .describe('Available start time in the property local time zone'),
            serviceTypeKey: z
              .string()
              .optional()
              .describe('Service type available at this time'),
            price: z
              .number()
              .nullable()
              .optional()
              .describe('Price in the smallest currency unit'),
            currency: z.string().nullable().optional().describe('Currency of the price')
          })
        )
        .describe('Available booking time slots for the next 4 weeks')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listBookingAvailabilities({
      serviceTypeKey: ctx.input.serviceTypeKey,
      addressId: ctx.input.addressId
    });

    let slots = (result.data ?? result ?? []).map((slot: any) => ({
      startTime:
        slot.start_time ??
        slot.start ??
        slot.start_datetime ??
        formatTidyDateTime({ date: slot.date, time: slot.time }) ??
        '',
      endTime:
        slot.end_time ??
        slot.end ??
        slot.end_datetime ??
        bookingEndTime(
          slot.date,
          slot.time,
          slot.service_type_key ?? ctx.input.serviceTypeKey
        ),
      date: slot.date,
      time: slot.time,
      serviceTypeKey: slot.service_type_key,
      price: slot.price ?? null,
      currency: slot.currency ?? null
    }));

    return {
      output: { availabilities: slots },
      message: `Found **${slots.length}** available time slot(s) for \`${ctx.input.serviceTypeKey}\`.`
    };
  })
  .build();
