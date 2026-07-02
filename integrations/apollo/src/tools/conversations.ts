import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { apolloServiceError } from '../lib/errors';
import { spec } from '../spec';

let conversationOutputSchema = z.object({
  conversationId: z.string().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  accountId: z.string().optional(),
  contactIds: z.array(z.string()).optional(),
  startedAt: z.string().optional(),
  endedAt: z.string().optional(),
  summary: z.string().optional(),
  raw: z.record(z.string(), z.any()).optional()
});

let formatConversation = (conversation: Record<string, any>) => ({
  conversationId: conversation.id,
  title: conversation.title || conversation.name,
  type: conversation.conversation_type || conversation.type,
  accountId: conversation.account_id,
  contactIds: conversation.contact_ids,
  startedAt: conversation.started_at || conversation.start_time,
  endedAt: conversation.ended_at || conversation.end_time,
  summary: conversation.summary,
  raw: conversation
});

export let searchConversations = SlateTool.create(spec, {
  name: 'Search Conversations',
  key: 'search_conversations',
  description:
    'Search Apollo conversations by type, account, contacts, tags, trackers, organizations, date range, and scorecard filters.',
  constraints: ['Does not return transcripts or recording URLs'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationType: z
        .enum(['video_conference', 'phone_call'])
        .optional()
        .describe('Filter by video conference or phone call conversations'),
      accountId: z.string().optional().describe('Apollo account ID filter'),
      contactIds: z.array(z.string()).optional().describe('Apollo contact ID filters'),
      tagIds: z.array(z.string()).optional().describe('Tag or label ID filters'),
      trackerIds: z.array(z.string()).optional().describe('Tracker ID filters'),
      organizationIds: z
        .array(z.string())
        .optional()
        .describe('Apollo organization ID filters'),
      dateFrom: z.string().optional().describe('Date range start for conversations'),
      dateTo: z.string().optional().describe('Date range end for conversations'),
      scorecardTemplateId: z.string().optional().describe('Scorecard template ID filter'),
      scorecardMaxRating: z.number().optional().describe('Maximum scorecard rating filter'),
      sortByField: z.string().optional().describe('Field to sort results by'),
      enforceContactBoundary: z
        .boolean()
        .optional()
        .describe('Restrict results to conversations visible to specified contacts'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25)')
    })
  )
  .output(
    z.object({
      conversations: z.array(conversationOutputSchema),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.searchConversations({
      conversationType: ctx.input.conversationType,
      accountId: ctx.input.accountId,
      contactIds: ctx.input.contactIds,
      tagIds: ctx.input.tagIds,
      trackerIds: ctx.input.trackerIds,
      organizationIds: ctx.input.organizationIds,
      dateRange:
        ctx.input.dateFrom || ctx.input.dateTo
          ? {
              min: ctx.input.dateFrom,
              max: ctx.input.dateTo
            }
          : undefined,
      scorecardTemplateId: ctx.input.scorecardTemplateId,
      scorecardMaxRating: ctx.input.scorecardMaxRating,
      sortByField: ctx.input.sortByField,
      enforceContactBoundary: ctx.input.enforceContactBoundary,
      page: ctx.input.page,
      numFetchResult: ctx.input.perPage
    });
    let conversations = result.conversations.map(formatConversation);

    return {
      output: {
        conversations,
        totalEntries: result.pagination?.total_entries,
        currentPage: result.pagination?.page,
        totalPages: result.pagination?.total_pages
      },
      message: `Found **${result.pagination?.total_entries ?? conversations.length}** conversation(s). Returned ${conversations.length}.`
    };
  })
  .build();

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: 'Retrieve full details for a single Apollo conversation by conversation ID.',
  constraints: ['May consume credits according to your Apollo plan'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z
        .string()
        .describe(
          'Apollo conversation ID. Share ID suffixes in id_shareid format are supported.'
        )
    })
  )
  .output(
    z.object({
      conversation: conversationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.getConversation(ctx.input.conversationId);
    let conversation = formatConversation(result.conversation);

    return {
      output: { conversation },
      message: `Retrieved conversation **${conversation.title || conversation.conversationId}**.`
    };
  })
  .build();

export let exportConversations = SlateTool.create(spec, {
  name: 'Export Conversations',
  key: 'export_conversations',
  description:
    'Request an asynchronous Apollo conversation export for a time range. Apollo emails the specified team member when the gzipped JSON export is ready.',
  constraints: ['Consumes credits for conversations with insights in the requested range'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      startTime: z.string().describe('Export range start time in ISO 8601 format'),
      endTime: z.string().describe('Export range end time in ISO 8601 format'),
      email: z.string().describe('Team member email address to notify when ready')
    })
  )
  .output(
    z.object({
      exportRequest: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let start = Date.parse(ctx.input.startTime);
    let end = Date.parse(ctx.input.endTime);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
      throw apolloServiceError(
        'startTime must be earlier than endTime and both must be valid dates.'
      );
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let exportRequest = await client.exportConversations({
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      email: ctx.input.email
    });

    return {
      output: { exportRequest },
      message: `Requested conversation export for **${ctx.input.email}**.`
    };
  })
  .build();
