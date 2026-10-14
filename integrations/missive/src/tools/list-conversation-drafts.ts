import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversationDrafts = SlateTool.create(spec, {
  name: 'List Conversation Drafts',
  key: 'list_conversation_drafts',
  description:
    'List unsent drafts in a conversation, including their IDs and previews for review.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      conversationId: z
        .string()
        .describe('Conversation ID from list_conversations or send_message'),
      limit: z
        .number()
        .min(1)
        .max(10)
        .optional()
        .describe('Number of drafts to return, up to 10'),
      until: z
        .number()
        .optional()
        .describe('Unix timestamp cursor from the oldest draft in the preceding page')
    })
  )
  .output(
    z.object({
      drafts: z.array(
        z.object({
          draftId: z.string(),
          subject: z.string().optional(),
          preview: z.string().optional(),
          deliveredAt: z.number().optional(),
          createdAt: z.number().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.limit !== undefined && !Number.isInteger(ctx.input.limit)) {
      throw createApiServiceError('limit must be a whole number between 1 and 10.');
    }
    let params: Record<string, number> = {};
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;
    if (ctx.input.until !== undefined) params.until = ctx.input.until;
    let data = await new Client({ token: ctx.auth.token }).listConversationDrafts(
      ctx.input.conversationId,
      params
    );
    let drafts = (data.drafts ?? []).map((draft: any) => ({
      draftId: draft.id,
      subject: draft.subject ?? undefined,
      preview: draft.preview ?? undefined,
      deliveredAt: draft.delivered_at ?? undefined,
      createdAt: draft.created_at ?? undefined
    }));
    return { output: { drafts }, message: `Retrieved **${drafts.length}** drafts.` };
  })
  .build();
