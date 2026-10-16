import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPresentationsTool = SlateTool.create(spec, {
  name: 'List Event Presentations',
  key: 'list_presentations',
  description:
    'List scheduled presentations or sessions for an event through the current Sympla API, including presentation IDs, dates, publication state, and sectors. Discover the string event ID hash with list_current_events; continue with pagination.next_cursor when present.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      eventIdHash: z
        .string()
        .describe(
          'String event ID hash from list_current_events, rather than a legacy numeric ID'
        ),
      published: z
        .boolean()
        .optional()
        .describe('Only published presentations. Defaults to true.'),
      from: z
        .string()
        .optional()
        .describe('Earliest presentation start date/time in the chosen timezone'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone. Defaults to America/Sao_Paulo.'),
      sort: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Start-date sort direction. Defaults to asc.'),
      pageSize: z
        .number()
        .optional()
        .describe('Results per page, from 1 to 200. Defaults to 100.'),
      cursor: z
        .string()
        .optional()
        .describe('Exact pagination.next_cursor from the preceding response'),
      filterOnlineSector: z
        .boolean()
        .optional()
        .describe('Filter sectors to those offering online sales. Provider default: true.')
    })
  )
  .output(
    z.object({
      presentations: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Unmodified provider presentations; absent for HTTP 204'),
      pagination: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe(
          'Provider pagination metadata, including next_cursor when another page exists'
        ),
      sort: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('Provider sort metadata'),
      httpStatus: z.number().describe('Actual HTTP response status; 204 means no content')
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth.token).listPresentations(
      ctx.input.eventIdHash,
      ctx.input
    );
    return {
      output: {
        presentations: response.status === 204 ? undefined : response.data.data,
        pagination: response.status === 204 ? undefined : response.data.pagination,
        sort: response.status === 204 ? undefined : response.data.sort,
        httpStatus: response.status
      },
      message:
        response.status === 204 ? 'Sympla returned no content.' : 'Retrieved presentations.'
    };
  })
  .build();
