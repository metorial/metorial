import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieve messages published by or received by owned profiles in Sprout Social. Includes posts, comments, direct messages, mentions, reviews, and replies across all connected social networks. Messages include Sprout actions taken (reply, tag, complete, like) and associated case IDs.`,
  instructions: [
    'The group_id filter is required. Get group IDs from the Get Metadata tool.',
    'Filter format examples: "group_id.eq(12345)", "customer_profile_id.eq(1234, 5678)", "created_time.in(2024-01-01..2024-02-01)", "post_type.eq(TWEET, FACEBOOK_POST)".',
    'Available fields: "network", "created_time", "post_category", "post_type", "perma_link", "text", "from", "profile_guid", "internal.tags.id", "internal.sent_by.id".',
    'Use pageCursor from previous responses to paginate through results.'
  ],
  constraints: [
    'Only text-based direct messages are retrievable; DMs with images or videos are not supported.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.number().describe('Group ID to retrieve messages for (required).'),
      profileIds: z
        .array(z.number())
        .optional()
        .describe('Optional array of customer_profile_id values to filter by.'),
      startTime: z
        .string()
        .optional()
        .describe('Start time in ISO 8601 or YYYY-MM-DD format.'),
      endTime: z.string().optional().describe('End time in ISO 8601 or YYYY-MM-DD format.'),
      postTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Post types to filter by (e.g., "TWEET", "FACEBOOK_POST", "INSTAGRAM_MEDIA").'
        ),
      tagIds: z.array(z.number()).optional().describe('Tag IDs to filter messages by.'),
      messageId: z
        .string()
        .optional()
        .describe('Specific message ID to retrieve (mutually exclusive with other filters).'),
      fields: z.array(z.string()).optional().describe('Fields to return in the response.'),
      sort: z.array(z.string()).optional().describe('Sort order (e.g., "created_time:desc").'),
      timezone: z.string().optional().describe('IANA timezone (e.g., "America/Chicago").'),
      limit: z.number().optional().describe('Number of results per page (max 50).'),
      pageCursor: z
        .string()
        .optional()
        .describe('Cursor for pagination from a previous response.')
    })
  )
  .output(
    z.object({
      messages: z.array(z.any()).describe('Array of message objects.'),
      pageCursor: z
        .string()
        .optional()
        .describe('Cursor for fetching the next page of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId
    });

    let filters: string[] = [];

    if (ctx.input.messageId) {
      filters.push(`message_id.eq(${ctx.input.messageId})`);
    } else {
      filters.push(`group_id.eq(${ctx.input.groupId})`);
      if (ctx.input.profileIds?.length) {
        filters.push(`customer_profile_id.eq(${ctx.input.profileIds.join(', ')})`);
      }
      if (ctx.input.startTime && ctx.input.endTime) {
        filters.push(`created_time.in(${ctx.input.startTime}..${ctx.input.endTime})`);
      }
      if (ctx.input.postTypes?.length) {
        filters.push(`post_type.eq(${ctx.input.postTypes.join(', ')})`);
      }
      if (ctx.input.tagIds?.length) {
        filters.push(`tag_id.eq(${ctx.input.tagIds.join(', ')})`);
      }
    }

    let result = await client.getMessages({
      filters,
      fields: ctx.input.fields,
      sort: ctx.input.sort,
      timezone: ctx.input.timezone,
      limit: ctx.input.limit,
      pageCursor: ctx.input.pageCursor
    });

    let messages = result?.data ?? [];
    let pageCursor = result?.paging?.page_cursor;

    return {
      output: { messages, pageCursor },
      message: `Retrieved **${messages.length}** messages from group ${ctx.input.groupId}.${pageCursor ? ' More results available with pagination cursor.' : ''}`
    };
  });
