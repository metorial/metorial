import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageChat = SlateTool.create(spec, {
  name: 'Manage Chat',
  key: 'manage_chat',
  description: `Create, mute/unmute, or delete a chat conversation. Creating a chat starts a conversation with another user by email. Muting suppresses notifications for the chat.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'mute', 'unmute', 'delete'])
        .describe('Action to perform on the chat'),
      chatIden: z
        .string()
        .optional()
        .describe('Chat identifier (required for mute, unmute, and delete)'),
      email: z
        .string()
        .optional()
        .describe('Email of the person to start a chat with (required for create)')
    })
  )
  .output(
    z.object({
      chatIden: z.string().describe('Unique identifier of the chat'),
      action: z.string().describe('Action that was performed'),
      contactName: z.string().optional().describe('Name of the chat contact'),
      contactEmail: z.string().optional().describe('Email of the chat contact'),
      muted: z.boolean().optional().describe('Current mute status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.email) {
        throw new Error('email is required for creating a chat');
      }
      let chat = await client.createChat(ctx.input.email);
      return {
        output: {
          chatIden: chat.iden,
          action: 'create',
          contactName: chat.with.name,
          contactEmail: chat.with.email,
          muted: chat.muted
        },
        message: `Created chat with **${chat.with.name || chat.with.email}**.`
      };
    }

    if (!ctx.input.chatIden) {
      throw new Error('chatIden is required for mute, unmute, and delete actions');
    }

    if (ctx.input.action === 'mute' || ctx.input.action === 'unmute') {
      let muted = ctx.input.action === 'mute';
      let chat = await client.updateChat(ctx.input.chatIden, { muted });
      return {
        output: {
          chatIden: chat.iden,
          action: ctx.input.action,
          contactName: chat.with.name,
          contactEmail: chat.with.email,
          muted: chat.muted
        },
        message: `Chat with **${chat.with.name || chat.with.email}** has been **${ctx.input.action}d**.`
      };
    }

    // delete
    await client.deleteChat(ctx.input.chatIden);
    return {
      output: {
        chatIden: ctx.input.chatIden,
        action: 'delete'
      },
      message: `Deleted chat \`${ctx.input.chatIden}\`.`
    };
  })
  .build();
