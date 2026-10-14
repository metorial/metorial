import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnecteamClient } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Retrieve a list of chat conversations (team chats and channels) from Connecteam. Private conversations are not included. Also retrieves custom publishers that can be used to send messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includePublishers: z.boolean().optional().describe('Also retrieve custom publishers'),
      limit: z.number().optional().describe('Results per page'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      conversations: z.array(z.any()).describe('List of conversations'),
      publishers: z
        .array(z.any())
        .optional()
        .describe('List of custom publishers (if requested)'),
      nextOffset: z.number().optional().describe('Next conversations page offset'),
      nextPublisherOffset: z.number().optional().describe('Next publishers page offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      ...ctx.auth,
      baseUrl: ctx.auth.baseUrl ?? (ctx.config as { baseUrl?: string }).baseUrl
    });

    let convResult = await client.getConversations({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let conversations = convResult.data?.conversations ?? [];
    let publishers: any[] | undefined;
    let nextPublisherOffset: number | undefined;

    if (ctx.input.includePublishers) {
      let pubResult = await client.getPublishers({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
      publishers = pubResult.data?.publishers ?? [];
      nextPublisherOffset = pubResult.paging?.offset;
    }

    return {
      output: {
        conversations,
        publishers,
        nextOffset: convResult.paging?.offset,
        nextPublisherOffset
      },
      message: `Retrieved **${Array.isArray(conversations) ? conversations.length : 0}** conversation(s).${publishers ? ` Also found **${publishers.length}** publisher(s).` : ''}`
    };
  })
  .build();
