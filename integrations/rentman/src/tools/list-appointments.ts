import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAppointments = SlateTool.create(spec, {
  name: 'List Appointments',
  key: 'list_appointments',
  description:
    'Browse Rentman appointments and discover IDs for updating or deleting them. Optionally filter by appointment start time.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .default(25)
        .describe('Maximum number of results (max 1500).'),
      offset: z.number().optional().default(0).describe('Number of results to skip.'),
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque cursor token from a previous nextPageUrl. Pass it unchanged and repeat the original filters, resource IDs, sort, and fields.'
        ),
      sort: z
        .string()
        .optional()
        .describe('Comma-separated sort fields prefixed with + or -.'),
      fields: z.string().optional().describe('Comma-separated provider fields to return.'),
      startAfter: z
        .string()
        .optional()
        .describe('Include appointments starting at or after this ISO 8601 date/time.'),
      startBefore: z
        .string()
        .optional()
        .describe('Include appointments starting at or before this ISO 8601 date/time.')
    })
  )
  .output(
    z.object({
      appointments: z
        .array(z.record(z.string(), z.any()))
        .describe('Appointments with stable id, name, start, end, and scheduling details.'),
      itemCount: z.number().describe('Number of items in this response page.'),
      limit: z.number(),
      offset: z.number(),
      nextPageUrl: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let result = await client.list('appointments', {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      cursor: ctx.input.cursor,
      sort: ctx.input.sort,
      fields: ctx.input.fields,
      'start[gte]': ctx.input.startAfter,
      'start[lte]': ctx.input.startBefore
    });
    return {
      output: {
        appointments: result.data,
        itemCount: result.itemCount,
        limit: result.limit,
        offset: result.offset,
        nextPageUrl: result.next_page_url
      },
      message: `Retrieved **${result.data.length}** appointments.`
    };
  })
  .build();
