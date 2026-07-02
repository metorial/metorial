import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listChats = SlateTool.create(spec, {
  name: 'List Chats',
  key: 'list_chats',
  description: `Retrieve all chat conversations on the Pushbullet account. Returns chat partner details including name, email, and mute status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      activeOnly: z
        .boolean()
        .optional()
        .default(true)
        .describe('Only return non-deleted chats')
    })
  )
  .output(
    z.object({
      chats: z.array(
        z.object({
          chatIden: z.string().describe('Unique identifier of the chat'),
          active: z.boolean().describe('Whether the chat is active'),
          muted: z.boolean().describe('Whether notifications are muted'),
          contactName: z.string().optional().describe('Name of the chat contact'),
          contactEmail: z.string().describe('Email of the chat contact'),
          contactType: z.string().describe('Contact type (email or user)'),
          contactImageUrl: z.string().optional().describe('Profile image URL of the contact'),
          created: z.string().describe('Creation Unix timestamp'),
          modified: z.string().describe('Last modification Unix timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listChats({
      active: ctx.input.activeOnly
    });

    let chats = result.chats.map(c => ({
      chatIden: c.iden,
      active: c.active,
      muted: c.muted,
      contactName: c.with.name,
      contactEmail: c.with.email,
      contactType: c.with.type,
      contactImageUrl: c.with.image_url,
      created: String(c.created),
      modified: String(c.modified)
    }));

    return {
      output: { chats },
      message: `Found **${chats.length}** chat(s).`
    };
  })
  .build();
