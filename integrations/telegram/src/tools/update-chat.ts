import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelegramClient } from '../lib/client';
import { spec } from '../spec';

export let updateChatTool = SlateTool.create(spec, {
  name: 'Update Chat',
  key: 'update_chat',
  description: `Update a chat's title, description, or create an invite link. The bot must be an admin with the appropriate permissions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatId: z.string().describe('Chat ID or @username'),
      title: z.string().optional().describe('New chat title (1-128 characters)'),
      description: z.string().optional().describe('New chat description (0-255 characters)'),
      createInviteLink: z
        .boolean()
        .optional()
        .describe('Whether to create and return a new invite link'),
      inviteLinkName: z.string().optional().describe('Name for the invite link'),
      inviteLinkExpireDate: z
        .number()
        .optional()
        .describe('Unix timestamp when the invite link expires'),
      inviteLinkMemberLimit: z
        .number()
        .optional()
        .describe('Maximum number of members that can join via this link (1-99999)')
    })
  )
  .output(
    z.object({
      titleUpdated: z.boolean().describe('Whether the title was updated'),
      descriptionUpdated: z.boolean().describe('Whether the description was updated'),
      inviteLink: z.string().optional().describe('Generated invite link URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelegramClient(ctx.auth.token);
    let titleUpdated = false;
    let descriptionUpdated = false;
    let inviteLink: string | undefined;

    if (ctx.input.title) {
      await client.setChatTitle({ chatId: ctx.input.chatId, title: ctx.input.title });
      titleUpdated = true;
    }

    if (ctx.input.description !== undefined) {
      await client.setChatDescription({
        chatId: ctx.input.chatId,
        description: ctx.input.description
      });
      descriptionUpdated = true;
    }

    if (ctx.input.createInviteLink) {
      let link = await client.createChatInviteLink({
        chatId: ctx.input.chatId,
        name: ctx.input.inviteLinkName,
        expireDate: ctx.input.inviteLinkExpireDate,
        memberLimit: ctx.input.inviteLinkMemberLimit
      });
      inviteLink = link.invite_link;
    }

    let actions: string[] = [];
    if (titleUpdated) actions.push('title updated');
    if (descriptionUpdated) actions.push('description updated');
    if (inviteLink) actions.push(`invite link created: ${inviteLink}`);

    return {
      output: { titleUpdated, descriptionUpdated, inviteLink },
      message:
        actions.length > 0
          ? `Chat **${ctx.input.chatId}**: ${actions.join(', ')}.`
          : `No updates were applied to chat **${ctx.input.chatId}**.`
    };
  })
  .build();
