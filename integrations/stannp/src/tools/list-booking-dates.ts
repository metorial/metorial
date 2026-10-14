import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let listBookingDates = SlateTool.create(spec, {
  name: 'List Booking Dates',
  key: 'list_booking_dates',
  description:
    'Find available dispatch dates before booking a campaign. Defaults to today through the next 30 days.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      startDate: z.string().optional().describe('First date in YYYY-MM-DD format'),
      endDate: z.string().optional().describe('Last date in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      dates: z.array(z.string()).describe('Available dispatch dates in YYYY-MM-DD format')
    })
  )
  .handleInvocation(async ctx => {
    let dates = await createClient(ctx.auth, ctx.config).getAvailableBookingDates(
      ctx.input.startDate,
      ctx.input.endDate
    );
    if (!Array.isArray(dates) || !dates.every(date => typeof date === 'string')) {
      throw createApiServiceError('Stannp returned an invalid list of booking dates.');
    }
    return {
      output: { dates },
      message: `Found **${dates.length}** available booking dates.`
    };
  })
  .build();
