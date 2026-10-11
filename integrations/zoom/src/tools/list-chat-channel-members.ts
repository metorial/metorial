import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZOOM_USER_AUTH_METHODS } from '../lib/authMethods';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

// https://developers.zoom.us/docs/api/team-chat/#tag/chat-channels/GET/chat/channels/{channelId}/members
export let listChatChannelMembers = SlateTool.create(spec, {
  name: 'List Chat Channel Members',
  key: 'list_chat_channel_members',
  description: `List the members of a Zoom Team Chat channel with their names, emails, user and member IDs, roles, and whether they are external. Use a contact's email, user ID, or member ID as the recipient of a direct message.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().min(1).describe('Channel ID, as returned by list_chat_channels'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of members per page (default 30, max 100)'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Pagination token for the next page. Tokens expire after 15 minutes.')
    })
  )
  .output(
    z.object({
      totalRecords: z.number().optional().describe('Total number of channel members'),
      nextPageToken: z.string().optional().describe('Token for the next page'),
      members: z
        .array(
          z.object({
            userId: z
              .string()
              .optional()
              .describe('Zoom user ID. Empty for members outside the current account'),
            memberId: z.string().optional().describe('Channel member ID'),
            email: z
              .string()
              .optional()
              .describe(
                'Email address. Empty for members outside the account who are not contacts'
              ),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            displayName: z.string().optional().describe('Display name'),
            role: z.string().optional().describe('Channel role: owner, admin, or member'),
            isExternal: z.boolean().optional().describe('Whether the member is external')
          })
        )
        .describe('Channel members')
    })
  )
  .authMethods(ZOOM_USER_AUTH_METHODS)
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.listChannelMembers(ctx.input.channelId, {
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken
    });

    let members = (result.members || []).map((member: any) => ({
      userId: member.id || undefined,
      memberId: member.member_id || undefined,
      email: member.email || undefined,
      firstName: member.first_name || undefined,
      lastName: member.last_name || undefined,
      displayName: member.name || undefined,
      role: member.role || undefined,
      isExternal: member.is_external
    }));

    return {
      output: {
        totalRecords: result.total_records,
        nextPageToken: result.next_page_token || undefined,
        members
      },
      message: `Found **${members.length}** member(s) in channel ${ctx.input.channelId}.`
    };
  })
  .build();
