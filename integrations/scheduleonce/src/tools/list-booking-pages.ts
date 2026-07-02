import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let bookingPageSchema = z.object({
  bookingPageId: z.string().describe('Unique booking page identifier'),
  name: z.string().describe('Booking page name'),
  url: z.string().describe('Public URL of the booking page'),
  published: z.boolean().describe('Whether the booking page is published')
});

export let listBookingPages = SlateTool.create(spec, {
  name: 'List Booking Pages',
  key: 'list_booking_pages',
  description: `Retrieve all booking pages (Classic) in your ScheduleOnce account.
Booking pages are the legacy scheduling interface. Use this to look up booking page IDs for filtering bookings or understanding your scheduling configuration.`,
  constraints: ['Maximum 100 booking pages per request (default 10).'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of booking pages to return (1-100, default 10)'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of booking pages'),
      bookingPages: z.array(bookingPageSchema).describe('List of booking pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listBookingPages({
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    let bookingPages = (result.data || []).map(bp => ({
      bookingPageId: bp.id,
      name: bp.name,
      url: bp.url,
      published: bp.published
    }));

    return {
      output: {
        count: result.count,
        bookingPages
      },
      message: `Found **${result.count}** booking page(s). Returned **${bookingPages.length}** in this page.`
    };
  })
  .build();
