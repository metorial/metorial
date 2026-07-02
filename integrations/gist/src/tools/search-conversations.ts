import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let searchConversations = SlateTool.create(spec, {
  name: 'Search Conversations',
  key: 'search_conversations',
  description: `Search and filter conversations in Gist. Filter by assignee, team, channel, tags, and contact. Also retrieves conversation counts.`,
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
    let client = new GistClient({ token: ctx.auth.token });

    let params: Record<string, any> = {};
    if (ctx.input.assigneeId) params.assignee_id = ctx.input.assigneeId;
    if (ctx.input.teamId) params.team_id = ctx.input.teamId;
    if (ctx.input.channel) params.channel = ctx.input.channel;
    if (ctx.input.tagId) params.tag_id = ctx.input.tagId;
    if (ctx.input.contactId) params.contact_id = ctx.input.contactId;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.perPage) params.per_page = ctx.input.perPage;

    let data = await client.searchConversations(params);
    let conversations = (data.conversations || []).map((c: any) => ({
      conversationId: String(c.id),
      subject: c.subject,
      contactId: c.contact_id ? String(c.contact_id) : undefined,
      assigneeId: c.assignee_id ? String(c.assignee_id) : undefined,
      teamId: c.team_id ? String(c.team_id) : undefined,
      status: c.status,
      priority: c.priority,
      createdAt: c.created_at ? String(c.created_at) : undefined
    }));

    return {
      output: {
        conversations,
        pages: data.pages
      },
      message: `Found **${conversations.length}** conversations.`
    };
  })
  .build();
