import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCurrentEventsTool = SlateTool.create(spec, {
  name: 'List Current API Events',
  key: 'list_current_events',
  description:
    'Discover events through the current Sympla API. Returns the provider event objects, including string event ID hashes used by list_presentations and get_presentation. Continue with pagination.next_cursor when present.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      published: z
        .enum(['published', 'not_published', 'all'])
        .optional()
        .describe('Publication filter. Defaults to published.'),
      from: z
        .string()
        .optional()
        .describe('Earliest event start date/time in the chosen timezone'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone. Defaults to America/Sao_Paulo.'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort direction. Defaults to asc.'),
      fieldSort: z
        .enum(['start_date', 'end_date', 'name'])
        .optional()
        .describe('Event field to sort by. Defaults to start_date.'),
      pageSize: z
        .number()
        .optional()
        .describe('Results per page, from 1 to 200. Defaults to 100.'),
      cursor: z
        .string()
        .optional()
        .describe('Exact pagination.next_cursor from the preceding response')
    })
  )
  .output(
    z.object({
      events: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Unmodified provider events; absent for HTTP 204'),
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
    let response = await new Client(ctx.auth.token).listCurrentEvents(ctx.input);
    return {
      output: {
        events: response.status === 204 ? undefined : response.data.data,
        pagination: response.status === 204 ? undefined : response.data.pagination,
        sort: response.status === 204 ? undefined : response.data.sort,
        httpStatus: response.status
      },
      message: response.status === 204 ? 'Sympla returned no content.' : 'Retrieved events.'
    };
  })
  .build();
