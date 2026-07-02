import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let conversationSchema = z.object({
  channelId: z.string().describe('Channel ID'),
  name: z.string().optional().describe('Channel name'),
  isChannel: z.boolean().optional().describe('Whether this is a public channel'),
  isPrivate: z.boolean().optional().describe('Whether this is a private channel'),
  isIm: z.boolean().optional().describe('Whether this is a direct message'),
  isMpim: z.boolean().optional().describe('Whether this is a group DM'),
  isArchived: z.boolean().optional().describe('Whether the channel is archived'),
  isMember: z.boolean().optional().describe('Whether the bot/user is a member'),
  numMembers: z.number().optional().describe('Number of members in the channel'),
  topic: z.string().optional().describe('Channel topic'),
  purpose: z.string().optional().describe('Channel purpose'),
  creator: z.string().optional().describe('User ID of the channel creator')
});

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List Slack conversations (channels, private channels, DMs, and group DMs) accessible to the authenticated user or bot. Supports filtering by conversation type and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.conversationRead)
  .input(
    z.object({
      types: z
        .string()
        .optional()
        .describe(
          'Comma-separated conversation types to include: public_channel, private_channel, im, mpim (default: public_channel)'
        ),
      excludeArchived: z.boolean().optional().describe('Whether to exclude archived channels'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results (default 100, max 1000)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      conversations: z.array(conversationSchema).describe('List of conversations'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);

    let result = await client.listConversations({
      types: ctx.input.types,
      excludeArchived: ctx.input.excludeArchived,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    return {
      output: {
        conversations: result.channels.map(c => ({
          channelId: c.id,
          name: c.name,
          isChannel: c.is_channel,
          isPrivate: c.is_private,
          isIm: c.is_im,
          isMpim: c.is_mpim,
          isArchived: c.is_archived,
          isMember: c.is_member,
          numMembers: c.num_members,
          topic: c.topic?.value,
          purpose: c.purpose?.value,
          creator: c.creator
        })),
        nextCursor: result.nextCursor
      },
      message: `Listed ${result.channels.length} conversations.`
    };
  })
  .build();
