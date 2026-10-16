import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, responseList, validatePagination } from '../lib/response';
import { spec } from '../spec';

export let listConversationMessages = SlateTool.create(spec, {
  name: 'List Conversation Messages',
  key: 'list_conversation_messages',
  description:
    'Read a page of conversation messages with optional internal notes. Use pagination to read beyond the first page.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      conversationId: z.string(),
      page: z.number().optional(),
      perPage: z.number().optional().describe('Results per page, at most 60'),
      withNotes: z.boolean().optional()
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageId: z.string(),
          body: z.string().optional(),
          authorId: z.string().optional(),
          authorType: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      pages: z.any().optional(),
      rawResponse: z.any()
    })
  )
  .handleInvocation(async ctx => {
    validatePagination({ page: ctx.input.page, perPage: ctx.input.perPage });
    let client = new GistClient({ token: ctx.auth.token });
    let data = await client.listMessages(ctx.input.conversationId, {
      page: ctx.input.page,
      per_page: ctx.input.perPage,
      with_notes: ctx.input.withNotes
    });
    let messages = responseList(data.messages).map(message => ({
      messageId: requiredId(message.id),
      body: message.body,
      authorId: message.author_id === undefined ? undefined : requiredId(message.author_id),
      authorType: message.author_type,
      createdAt: message.created_at === undefined ? undefined : String(message.created_at)
    }));
    return {
      output: { messages, pages: data.pages, rawResponse: client.responses },
      message: `Retrieved **${messages.length}** conversation messages.`
    };
  })
  .build();
