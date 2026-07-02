import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Retrieve conversations between AI agents and end users. Supports filtering by date range and fetching a specific conversation with its transcript. Can also list conversations for a specific contact.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().optional().describe('Specific conversation ID to retrieve'),
      contactId: z.string().optional().describe('Filter conversations by contact ID'),
      includeTranscript: z
        .boolean()
        .optional()
        .describe('Include full transcript for a specific conversation'),
      dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number (default 1)'),
      size: z.number().optional().describe('Items per page (default 50, max 100)')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            conversationId: z.string(),
            contactId: z.string().optional(),
            assistantId: z.string().optional(),
            widgetId: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      conversation: z
        .object({
          conversationId: z.string(),
          contactId: z.string().optional(),
          assistantId: z.string().optional(),
          widgetId: z.string().optional(),
          createdAt: z.string().optional(),
          transcript: z.array(z.any()).optional()
        })
        .optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.conversationId) {
      let result = await client.getConversation(ctx.input.conversationId);
      let data = result.data || result;
      let transcript: any[] | undefined;

      if (ctx.input.includeTranscript) {
        let transcriptResult = await client.getConversationTranscript(
          ctx.input.conversationId
        );
        transcript = transcriptResult.data || transcriptResult;
      }

      return {
        output: {
          conversation: {
            conversationId: data.id,
            contactId: data.contact_id,
            assistantId: data.assistant_id,
            widgetId: data.widget_id,
            createdAt: data.created_at,
            transcript
          }
        },
        message: `Retrieved conversation \`${data.id}\`.`
      };
    }

    if (ctx.input.contactId) {
      let result = await client.getConversationsByContact(ctx.input.contactId);
      let items = result.data || result.items || result;
      let list = Array.isArray(items) ? items : [];
      return {
        output: {
          conversations: list.map((c: any) => ({
            conversationId: c.id,
            contactId: c.contact_id,
            assistantId: c.assistant_id,
            widgetId: c.widget_id,
            createdAt: c.created_at
          })),
          totalCount: list.length
        },
        message: `Found **${list.length}** conversation(s) for contact \`${ctx.input.contactId}\`.`
      };
    }

    let result = await client.listConversations({
      page: ctx.input.page,
      size: ctx.input.size,
      date_from: ctx.input.dateFrom,
      date_to: ctx.input.dateTo
    });
    let items = result.data || result.items || result;
    let list = Array.isArray(items) ? items : [];
    return {
      output: {
        conversations: list.map((c: any) => ({
          conversationId: c.id,
          contactId: c.contact_id,
          assistantId: c.assistant_id,
          widgetId: c.widget_id,
          createdAt: c.created_at
        })),
        totalCount: result.total || list.length
      },
      message: `Found **${list.length}** conversation(s).`
    };
  })
  .build();
