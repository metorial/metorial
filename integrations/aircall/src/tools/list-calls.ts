import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapCall } from '../lib/contracts';
import { spec } from '../spec';

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `List and search calls in Aircall. Filter by direction, phone number, user, tag IDs and time range. contactId is retained with guidance because no native filter is documented. Returns call metadata including direction, status, duration, participants, and associated recordings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().optional().describe('Filter calls by user ID'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Filter calls by phone number (E.164 format)'),
      contactId: z
        .number()
        .optional()
        .describe(
          'Retained unsupported native filter; use get_contact to select phoneNumber instead'
        ),
      direction: z
        .enum(['inbound', 'outbound'])
        .optional()
        .describe('Filter by call direction'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Filter by decimal tag ID strings from list_tags (AND condition)'),
      from: z.number().optional().describe('Start of time range as UNIX timestamp'),
      to: z.number().optional().describe('End of time range as UNIX timestamp'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by start time'),
      includeContacts: z.boolean().optional().describe('Include contact data in results'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (max: 50, default: 20)')
    })
  )
  .output(
    z.object({
      calls: z.array(
        z.object({
          callId: z.number().optional().describe('Unique call identifier'),
          callIdExact: z.string().describe('Exact decimal Int64 call ID'),
          direction: z.string().describe('Call direction (inbound or outbound)'),
          status: z.string().describe('Call status'),
          rawDigits: z.string().describe('Phone number in E.164 format or "anonymous"'),
          startedAt: z.number().nullable().describe('Call start time as UNIX timestamp'),
          answeredAt: z.number().nullable().describe('Call answer time as UNIX timestamp'),
          endedAt: z.number().nullable().describe('Call end time as UNIX timestamp'),
          duration: z.number().nullable().describe('Call duration in seconds'),
          recording: z.string().nullable().describe('Recording URL (valid for one hour)'),
          voicemail: z.string().nullable().describe('Voicemail URL (valid for one hour)'),
          archived: z.boolean().optional().describe('Whether the call is archived'),
          missedCallReason: z.string().nullable().describe('Reason the call was missed'),
          userName: z.string().nullable().describe('Name of the user who handled the call'),
          numberDigits: z.string().nullable().describe('Aircall number used'),
          tags: z
            .array(
              z.object({
                tagId: z.number(),
                tagName: z.string()
              })
            )
            .describe('Tags applied to the call'),
          commentsCount: z.number().describe('Number of comments on the call')
        })
      ),
      nextPageLink: z.string().nullable().optional(),
      previousPageLink: z.string().nullable().optional(),
      collectionLimit: z.number().optional(),
      historyWindowMonths: z.number().optional(),
      totalCount: z.number().describe('Total number of matching calls'),
      currentPage: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth);
    const search =
      ctx.input.userId !== undefined ||
      ctx.input.phoneNumber !== undefined ||
      ctx.input.contactId !== undefined ||
      ctx.input.direction !== undefined ||
      ctx.input.tags !== undefined;
    const options = { ...ctx.input, fetchContact: ctx.input.includeContacts };
    const result = search
      ? await client.searchCalls(options)
      : await client.listCalls(options);
    return {
      output: {
        calls: result.items.map(mapCall),
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage,
        perPage: result.meta.perPage,
        nextPageLink: result.meta.nextPageLink,
        previousPageLink: result.meta.previousPageLink,
        collectionLimit: 10000,
        historyWindowMonths: 6
      },
      message: `Retrieved ${result.items.length} calls from native page ${result.meta.currentPage}. The API exposes six months of history and at most 10,000 results per time window.`
    };
  })
  .build();
