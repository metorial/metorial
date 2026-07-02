import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkBookingAvailability = SlateTool.create(spec, {
  name: 'Check Booking Availability',
  key: 'check_booking_availability',
  description: `Query available time slots for booking a job at a specific address. Returns availability for the next 4 weeks. Use this before creating a job to find a suitable time window.`,
  instructions: [
    'Common service type keys: `regular_cleaning.one_hour`, `regular_cleaning.two_hours`, `regular_cleaning.three_hours`, `regular_cleaning.four_hours`.'
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
            endTime: z.string().describe('End time of the available slot')
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
      startTime: slot.start_time ?? slot.start ?? slot.start_datetime ?? '',
      endTime: slot.end_time ?? slot.end ?? slot.end_datetime ?? ''
    }));

    return {
      output: { availabilities: slots },
      message: `Found **${slots.length}** available time slot(s) for \`${ctx.input.serviceTypeKey}\`.`
    };
  })
  .build();
