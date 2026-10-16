import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, responseList, validatePagination } from '../lib/response';
import { spec } from '../spec';

export let searchConversations = SlateTool.create(spec, {
  name: 'Search Conversations',
  key: 'search_conversations',
  description: `Search and filter conversations in Gist. Filter by assignee, team, channel, tags, and contact.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      assigneeId: z.string().optional().describe('Filter by teammate assignee ID'),
      teamId: z.string().optional().describe('Filter by team ID'),
      channel: z
        .string()
        .optional()
        .describe('Filter by channel (chat, email, facebook, twitter, api)'),
      tagId: z.string().optional().describe('Filter by tag ID'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page (max: 60)')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      conversations: z.array(
        z.object({
          conversationId: z.string(),
          subject: z.string().optional(),
          contactId: z.string().optional(),
          assigneeId: z.string().optional(),
          teamId: z.string().optional(),
          status: z.string().optional(),
          priority: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      pages: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    validatePagination({ page: ctx.input.page, perPage: ctx.input.perPage });
    let client = new GistClient({ token: ctx.auth.token });

    let filters: Record<string, unknown>[] = [];
    for (let [key, value] of Object.entries({
      teammate_assigned_id: ctx.input.assigneeId,
      team_assigned_id: ctx.input.teamId,
      channel: ctx.input.channel,
      conversation_tags: ctx.input.tagId,
      'contact.id': ctx.input.contactId
    })) {
      if (value !== undefined) {
        let filterValue: string | number = value;
        if (key !== 'channel') {
          if (
            !/^\d+$/.test(value) ||
            !Number.isSafeInteger(Number(value)) ||
            Number(value) < 1
          )
            throw createApiServiceError(`${key} must be a positive numeric ID.`);
          filterValue = Number(value);
        }
        filters.push({ criteria: [{ key, operator: '=', value: filterValue }] });
      }
    }
    let data = filters.length
      ? await client.searchConversations({
          filter_query: filters,
          page: ctx.input.page,
          per_page: ctx.input.perPage
        })
      : await client.listConversations({ page: ctx.input.page, per_page: ctx.input.perPage });
    let conversations = responseList(data.conversations).map((c: any) => ({
      conversationId: requiredId(c.id),
      subject: c.subject,
      contactId: c.contact_id !== undefined ? String(c.contact_id) : undefined,
      assigneeId: c.assignee_id !== undefined ? String(c.assignee_id) : undefined,
      teamId: c.team_id !== undefined ? String(c.team_id) : undefined,
      status: c.status,
      priority: c.priority,
      createdAt: c.created_at !== undefined ? String(c.created_at) : undefined
    }));

    return {
      output: { rawResponse: client.responses, conversations, pages: data.pages },
      message: `Found **${conversations.length}** conversations.`
    };
  })
  .build();
