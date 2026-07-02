import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get My Profile & Status',
  key: 'get_profile',
  description: `Retrieves the authenticated user's profile information and account status. Returns profile details (name, email, organization, department) along with unread message counts, mention counts, and pending task counts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeStatus: z
        .boolean()
        .optional()
        .describe('Whether to also fetch unread/mention/task counts. Defaults to true.')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('Account ID'),
      name: z.string().describe('Display name'),
      chatworkId: z.string().describe('Chatwork ID'),
      email: z.string().describe('Email address'),
      organizationName: z.string().describe('Organization name'),
      department: z.string().describe('Department'),
      title: z.string().describe('Job title'),
      avatarImageUrl: z.string().describe('Avatar image URL'),
      introduction: z.string().describe('Self introduction text'),
      unreadCount: z.number().optional().describe('Total unread message count'),
      mentionCount: z.number().optional().describe('Total unread mention count'),
      taskCount: z.number().optional().describe('Total assigned task count'),
      unreadRoomCount: z.number().optional().describe('Number of rooms with unread messages'),
      mentionRoomCount: z.number().optional().describe('Number of rooms with mentions'),
      taskRoomCount: z.number().optional().describe('Number of rooms with tasks')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let me = await client.getMe();

    let includeStatus = ctx.input.includeStatus !== false;
    let status = includeStatus ? await client.getMyStatus() : null;

    return {
      output: {
        accountId: me.account_id,
        name: me.name,
        chatworkId: me.chatwork_id,
        email: me.mail || me.login_mail,
        organizationName: me.organization_name,
        department: me.department,
        title: me.title,
        avatarImageUrl: me.avatar_image_url,
        introduction: me.introduction,
        ...(status
          ? {
              unreadCount: status.unread_num,
              mentionCount: status.mention_num,
              taskCount: status.mytask_num,
              unreadRoomCount: status.unread_room_num,
              mentionRoomCount: status.mention_room_num,
              taskRoomCount: status.mytask_room_num
            }
          : {})
      },
      message: `Retrieved profile for **${me.name}**${status ? ` — ${status.unread_num} unread, ${status.mention_num} mentions, ${status.mytask_num} tasks` : ''}.`
    };
  })
  .build();
