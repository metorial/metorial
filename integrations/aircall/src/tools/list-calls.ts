import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `List and search calls in Aircall. Filter by direction, phone number, user, contact, tags, and time range. Returns call metadata including direction, status, duration, participants, and associated recordings.`,
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
      contactId: z.number().optional().describe('Filter calls by contact ID'),
      direction: z
        .enum(['inbound', 'outbound'])
        .optional()
        .describe('Filter by call direction'),
      tags: z.array(z.string()).optional().describe('Filter by tag names (AND condition)'),
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
          callId: z.number().describe('Unique call identifier'),
          direction: z.string().describe('Call direction (inbound or outbound)'),
          status: z.string().describe('Call status'),
          rawDigits: z.string().describe('Phone number in E.164 format or "anonymous"'),
          startedAt: z.number().nullable().describe('Call start time as UNIX timestamp'),
          answeredAt: z.number().nullable().describe('Call answer time as UNIX timestamp'),
          endedAt: z.number().nullable().describe('Call end time as UNIX timestamp'),
          duration: z.number().nullable().describe('Call duration in seconds'),
          recording: z.string().nullable().describe('Recording URL (valid for 10 minutes)'),
          voicemail: z.string().nullable().describe('Voicemail URL (valid for 10 minutes)'),
          archived: z.boolean().describe('Whether the call is archived'),
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
      totalCount: z.number().describe('Total number of matching calls'),
      currentPage: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let hasSearchFilters =
      ctx.input.userId ||
      ctx.input.phoneNumber ||
      ctx.input.contactId ||
      ctx.input.direction ||
      ctx.input.tags;

    let result: any;
    if (hasSearchFilters) {
      result = await client.searchCalls({
        userId: ctx.input.userId,
        phoneNumber: ctx.input.phoneNumber,
        contactId: ctx.input.contactId,
        direction: ctx.input.direction,
        tags: ctx.input.tags,
        from: ctx.input.from,
        to: ctx.input.to,
        order: ctx.input.order,
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        fetchContact: ctx.input.includeContacts
      });
    } else {
      result = await client.listCalls({
        from: ctx.input.from,
        to: ctx.input.to,
        order: ctx.input.order,
        page: ctx.input.page,
        perPage: ctx.input.perPage,
        fetchContact: ctx.input.includeContacts
      });
    }

    let calls = result.items.map((call: any) => ({
      callId: call.id,
      direction: call.direction,
      status: call.status,
      rawDigits: call.raw_digits || '',
      startedAt: call.started_at ?? null,
      answeredAt: call.answered_at ?? null,
      endedAt: call.ended_at ?? null,
      duration: call.duration ?? null,
      recording: call.recording ?? null,
      voicemail: call.voicemail ?? null,
      archived: call.archived ?? false,
      missedCallReason: call.missed_call_reason ?? null,
      userName: call.user?.name ?? null,
      numberDigits: call.number?.digits ?? null,
      tags: (call.tags || []).map((t: any) => ({
        tagId: t.id,
        tagName: t.name
      })),
      commentsCount: (call.comments || []).length
    }));

    return {
      output: {
        calls,
        totalCount: result.meta.total,
        currentPage: result.meta.currentPage,
        perPage: result.meta.perPage
      },
      message: `Found **${result.meta.total}** calls (showing page ${result.meta.currentPage}, ${calls.length} results).`
    };
  })
  .build();
