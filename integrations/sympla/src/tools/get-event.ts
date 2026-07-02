import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEventTool = SlateTool.create(spec, {
  name: 'Get Event',
  key: 'get_event',
  description: `Retrieve detailed information about a specific event by its ID. Returns full event details including dates, location, host, and categories.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Unique event identifier')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Unique event identifier'),
      name: z.string().describe('Event name'),
      detail: z.string().describe('Event description'),
      startDate: z.string().describe('Event start date'),
      endDate: z.string().describe('Event end date'),
      privateEvent: z.boolean().describe('Whether the event is private'),
      published: z.boolean().describe('Whether the event is published'),
      cancelled: z.boolean().describe('Whether the event is cancelled'),
      imageUrl: z.string().describe('Event image URL'),
      eventUrl: z.string().describe('Event page URL'),
      address: z
        .object({
          name: z.string().describe('Venue name'),
          address: z.string().describe('Street address'),
          city: z.string().describe('City'),
          state: z.string().describe('State'),
          country: z.string().describe('Country'),
          zipCode: z.string().describe('ZIP code')
        })
        .describe('Event location'),
      host: z
        .object({
          name: z.string().describe('Host name'),
          description: z.string().describe('Host description')
        })
        .describe('Event host information'),
      primaryCategory: z.string().describe('Primary category name'),
      secondaryCategory: z.string().describe('Secondary category name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let e = await client.getEvent(ctx.input.eventId);

    let output = {
      eventId: e.id,
      name: e.name ?? '',
      detail: e.detail ?? '',
      startDate: e.start_date ?? '',
      endDate: e.end_date ?? '',
      privateEvent: e.private_event === 1,
      published: e.published === 1,
      cancelled: e.cancelled === 1,
      imageUrl: e.image ?? '',
      eventUrl: e.url ?? '',
      address: {
        name: e.address?.name ?? '',
        address: e.address?.address ?? '',
        city: e.address?.city ?? '',
        state: e.address?.state ?? '',
        country: e.address?.country ?? '',
        zipCode: e.address?.zip_code ?? ''
      },
      host: {
        name: e.host?.name ?? '',
        description: e.host?.description ?? ''
      },
      primaryCategory: e.category_prim?.name ?? '',
      secondaryCategory: e.category_sec?.name ?? ''
    };

    return {
      output,
      message: `Retrieved event **${output.name}** (ID: ${output.eventId}).`
    };
  })
  .build();
