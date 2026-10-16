import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listChats = SlateTool.create(spec, {
  name: 'List Chats',
  key: 'list_chats',
  description: `Retrieve a page of chat conversations on the Pushbullet account. Returns chat partner details including name, email, and mute status.`,
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
        .describe('Only return non-deleted chats'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum results per page, from 1 to 500'),
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return records modified after this Unix timestamp in seconds')
    })
  )
  .output(
    z.object({
      chats: z.array(
        z.object({
          chatIden: z.string().describe('Unique identifier of the chat'),
          active: z.boolean().describe('Whether the chat is active'),
          muted: z.boolean().optional().describe('Whether notifications are muted'),
          contactName: z.string().optional().describe('Name of the chat contact'),
          contactEmail: z.string().optional().describe('Email of the chat contact'),
          contactType: z.string().optional().describe('Contact type (email or user)'),
          contactImageUrl: z.string().optional().describe('Profile image URL of the contact'),
          created: z.string().describe('Creation Unix timestamp'),
          modified: z.string().describe('Last modification Unix timestamp'),
          raw: z.unknown().optional().describe('Complete provider record')
        })
      ),
      cursor: z
        .string()
        .optional()
        .describe('Cursor for the next page, when more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listChats({
      active: ctx.input.activeOnly,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      modifiedAfter: ctx.input.modifiedAfter
    });

    let chats = (result.chats ?? []).map(c => ({
      chatIden: c.iden,
      active: c.active,
      muted: c.muted,
      contactName: c.with?.name,
      contactEmail: c.with?.email,
      contactType: c.with?.type,
      contactImageUrl: c.with?.image_url,
      created: String(c.created),
      modified: String(c.modified),
      raw: c
    }));

    return {
      output: { chats, cursor: result.cursor },
      message: `Found **${chats.length}** chat(s).`
    };
  })
  .build();
