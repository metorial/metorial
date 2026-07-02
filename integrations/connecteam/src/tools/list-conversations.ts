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
        .describe('List of custom publishers (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnecteamClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let convResult = await client.getConversations({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let conversations = convResult.data?.conversations ?? convResult.data ?? [];
    let publishers: any[] | undefined;

    if (ctx.input.includePublishers) {
      let pubResult = await client.getPublishers();
      publishers = pubResult.data?.publishers ?? pubResult.data ?? [];
    }

    return {
      output: {
        conversations,
        publishers
      },
      message: `Retrieved **${Array.isArray(conversations) ? conversations.length : 0}** conversation(s).${publishers ? ` Also found **${publishers.length}** publisher(s).` : ''}`
    };
  })
  .build();
