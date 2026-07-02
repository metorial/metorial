import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

let responseItemSchema = z.object({
  responseUuid: z.string().describe('UUID of the survey response'),
  firstShownAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp when survey was first shown'),
  lastShownAt: z.string().nullable().describe('ISO 8601 timestamp when survey was last shown'),
  showCounter: z.number().nullable().describe('Number of times the survey was shown'),
  firstDataReceptionAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp when first response data was received'),
  lastDataReceptionAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp when last response data was received'),
  completedAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp when the survey was completed'),
  receivedAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp when the response was received'),
  dismissedAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp when the survey was dismissed'),
  survey: z
    .object({
      surveyUuid: z.string().describe('UUID of the survey'),
      name: z.string().describe('Name of the survey')
    })
    .describe('The survey this response belongs to'),
  responseData: z
    .record(z.string(), z.unknown())
    .describe('Response data keyed by question identifier'),
  contact: z
    .object({
      contactUuid: z.string().describe('UUID of the responding contact'),
      remoteId: z.string().nullable().describe('External user ID'),
      email: z.string().nullable().describe('Email address'),
      displayName: z.string().nullable().describe('Display name')
    })
    .describe('Contact who submitted the response')
});

export let listResponses = SlateTool.create(spec, {
  name: 'List Survey Responses',
  key: 'list_responses',
  description: `Retrieve survey responses with filtering by survey, segment, date range, and completion status. Returns response data, survey info, and contact details for each response.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      surveyUuid: z.string().optional().describe('Filter by specific survey UUID'),
      surveyUuids: z.array(z.string()).optional().describe('Filter by multiple survey UUIDs'),
      segmentUuid: z.string().optional().describe('Filter by specific segment UUID'),
      segmentUuids: z
        .array(z.string())
        .optional()
        .describe('Filter by multiple segment UUIDs'),
      dateRangeStart: z
        .string()
        .optional()
        .describe('Start of date range (ISO 8601 format, e.g. "2024-01-01")'),
      dateRangeEnd: z.string().optional().describe('End of date range (ISO 8601 format)'),
      completionStatus: z
        .enum(['completed', 'partials', 'all'])
        .optional()
        .describe('Filter by completion status (default: "completed")'),
      search: z.string().optional().describe('Search by user ID, UUID, email, or name'),
      includeAttributes: z
        .boolean()
        .optional()
        .describe('Include full user attributes in contact data'),
      page: z.number().optional().describe('Page number for pagination'),
      pageCursor: z.string().optional().describe('Cursor for large dataset pagination'),
      pageLength: z.number().optional().describe('Number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      responses: z.array(responseItemSchema).describe('List of survey responses'),
      pagination: z
        .object({
          itemsCount: z.number().describe('Total number of items'),
          currentPage: z.number().describe('Current page number'),
          lastPage: z.number().describe('Last page number'),
          pageLength: z.number().describe('Items per page'),
          nextPageCursor: z.string().nullable().describe('Cursor for next page')
        })
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    let result = (await client.listResponses({
      formUuid: ctx.input.surveyUuid,
      formUuids: ctx.input.surveyUuids,
      segmentUuid: ctx.input.segmentUuid,
      segmentUuids: ctx.input.segmentUuids,
      dateRangeStart: ctx.input.dateRangeStart,
      dateRangeEnd: ctx.input.dateRangeEnd,
      include: ctx.input.completionStatus,
      search: ctx.input.search,
      withAttributes: ctx.input.includeAttributes,
      page: ctx.input.page,
      pageCursor: ctx.input.pageCursor,
      pageLength: ctx.input.pageLength
    })) as any;

    let responses = (result.items || []).map((item: any) => ({
      responseUuid: item.uuid,
      firstShownAt: item.first_shown_at ?? null,
      lastShownAt: item.last_shown_at ?? null,
      showCounter: item.show_counter ?? null,
      firstDataReceptionAt: item.first_data_reception_at ?? null,
      lastDataReceptionAt: item.last_data_reception_at ?? null,
      completedAt: item.completed_at ?? null,
      receivedAt: item.received_at ?? null,
      dismissedAt: item.dismissed_at ?? null,
      survey: {
        surveyUuid: item.form?.uuid ?? '',
        name: item.form?.name ?? ''
      },
      responseData: item.data ?? {},
      contact: {
        contactUuid: item.contact?.uuid ?? '',
        remoteId: item.contact?.remote_id ?? null,
        email: item.contact?.email ?? null,
        displayName: item.contact?.display_name ?? null
      }
    }));

    let pagination = result.pagination || {};

    return {
      output: {
        responses,
        pagination: {
          itemsCount: pagination.items_count ?? 0,
          currentPage: pagination.current_page ?? 1,
          lastPage: pagination.last_page ?? 1,
          pageLength: pagination.page_length ?? 50,
          nextPageCursor: pagination.next_page_cursor ?? null
        }
      },
      message: `Found **${responses.length}** responses (page ${pagination.current_page ?? 1} of ${pagination.last_page ?? 1}).`
    };
  })
  .build();
