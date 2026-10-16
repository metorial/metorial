import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listChatLabels = SlateTool.create(spec, {
  name: 'List Chat Labels',
  key: 'list_chat_labels',
  description:
    'Retrieve the labels currently assigned to a chat. Use get_chats to discover chat IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ chatId: z.number().describe('Chat ID from get_chats') }))
  .output(z.object({ labels: z.array(z.string()).describe('Current chat labels') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getChatLabels(ctx.input.chatId);
    let labels = z.array(z.string()).safeParse(result?.data?.labels);
    if (!labels.success) {
      throw createApiServiceError('TimelinesAI did not return chat labels.');
    }
    return {
      output: { labels: labels.data },
      message: `Retrieved ${labels.data.length} chat label(s).`
    };
  })
  .build();
