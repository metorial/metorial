import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let manageChatMemberTool = SlateTool.create(spec, {
  name: 'Manage Chat Member',
  key: 'manage_chat_member',
  description: `Manage a chat member by banning, unbanning, restricting, or promoting them. Can also retrieve a member's current status and permissions. The bot must be an admin with appropriate rights.`,
  instructions: [
    'Use action "get" to retrieve a member\'s current status.',
    'Use action "ban" or "unban" to manage banning.',
    'Use action "restrict" to limit permissions — provide a permissions object.',
    'Use action "promote" to grant admin rights — provide a permissions object.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID or @username'),
      userId: z.number().describe('User ID of the member to manage'),
      action: z
        .enum(['get', 'ban', 'unban', 'restrict', 'promote'])
        .describe('Action to perform on the member'),
      untilDate: z
        .number()
        .optional()
        .describe('Unix timestamp for ban/restriction expiry. 0 or omit for permanent.'),
      revokeMessages: z
        .boolean()
        .optional()
        .describe('Delete all messages from the banned user (ban only)'),
      onlyIfBanned: z
        .boolean()
        .optional()
        .describe('Only unban if currently banned (unban only)'),
      permissions: z
        .record(z.string(), z.boolean())
        .optional()
        .describe(
          'Permission flags for restrict/promote actions (e.g. can_send_messages, can_pin_messages, can_promote_members)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      status: z
        .string()
        .optional()
        .describe('Member status: creator, administrator, member, restricted, left, kicked'),
      userId: z.number().describe('User ID of the affected member'),
      userName: z.string().optional().describe('Username of the affected member'),
      firstName: z.string().optional().describe('First name of the affected member')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);
    let { chatId, userId, action } = ctx.input;

    if (action === 'get') {
      let member = await client.getChatMember({ chatId, userId });
      return {
        output: {
          success: true,
          status: member.status,
          userId: member.user.id,
          userName: member.user.username,
          firstName: member.user.first_name
        },
        message: `Member **${member.user.first_name || member.user.id}** has status **${member.status}** in chat **${chatId}**.`
      };
    }

    if (action === 'ban') {
      await client.banChatMember({
        chatId,
        userId,
        untilDate: ctx.input.untilDate,
        revokeMessages: ctx.input.revokeMessages
      });
      return {
        output: {
          success: true,
          status: 'kicked',
          userId,
          userName: undefined,
          firstName: undefined
        },
        message: `User **${userId}** banned from chat **${chatId}**.`
      };
    }

    if (action === 'unban') {
      await client.unbanChatMember({
        chatId,
        userId,
        onlyIfBanned: ctx.input.onlyIfBanned
      });
      return {
        output: {
          success: true,
          status: 'left',
          userId,
          userName: undefined,
          firstName: undefined
        },
        message: `User **${userId}** unbanned from chat **${chatId}**.`
      };
    }

    if (action === 'restrict') {
      await client.restrictChatMember({
        chatId,
        userId,
        permissions: ctx.input.permissions || {},
        untilDate: ctx.input.untilDate
      });
      return {
        output: {
          success: true,
          status: 'restricted',
          userId,
          userName: undefined,
          firstName: undefined
        },
        message: `User **${userId}** restricted in chat **${chatId}**.`
      };
    }

    if (action === 'promote') {
      await client.promoteChatMember({
        chatId,
        userId,
        permissions: ctx.input.permissions || {}
      });
      return {
        output: {
          success: true,
          status: 'administrator',
          userId,
          userName: undefined,
          firstName: undefined
        },
        message: `User **${userId}** promoted in chat **${chatId}**.`
      };
    }

    return {
      output: { success: false, userId, userName: undefined, firstName: undefined },
      message: `Unknown action: ${action}`
    };
  })
  .build();
