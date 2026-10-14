import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextCursorId } from '../lib/client';
import { spec } from '../spec';

export let listContactChannels = SlateTool.create(spec, {
  name: 'List Contact Channels',
  key: 'list_contact_channels',
  description:
    'Discover the messaging channels connected to a contact, including channel IDs and their latest message timestamps.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID from Get Contact or List Contacts'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum channels to return (1-100)'),
      cursorId: z.string().optional().describe('Cursor ID from the previous page')
    })
  )
  .output(
    z.object({
      channels: z.array(
        z.object({
          channelId: z.string(),
          name: z.string().optional(),
          source: z.string().optional(),
          lastMessageTime: z.number().optional(),
          lastIncomingMessageTime: z.number().optional(),
          createdAt: z.number().optional()
        })
      ),
      nextCursorId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listContactChannels(
      ctx.input.contactId,
      ctx.input.limit,
      ctx.input.cursorId
    );
    let data = result?.data ?? result;
    let channels = (data?.items ?? []).map((channel: any) => ({
      channelId: String(channel.id),
      name: channel.name ?? undefined,
      source: channel.source ?? undefined,
      lastMessageTime: channel.lastMessageTime ?? undefined,
      lastIncomingMessageTime: channel.lastIncomingMessageTime ?? undefined,
      createdAt: channel.created_at ?? undefined
    }));
    return {
      output: { channels, nextCursorId: nextCursorId(data) },
      message: `Found **${channels.length}** channel(s) for contact **${ctx.input.contactId}**.`
    };
  })
  .build();
