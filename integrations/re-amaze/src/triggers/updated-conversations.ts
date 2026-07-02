import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatedConversations = SlateTrigger.create(spec, {
  name: 'Updated Conversation',
  key: 'updated_conversations',
  description:
    'Triggers when a support conversation is updated (status change, new reply, reassignment, etc.).'
})
  .input(
    z.object({
      conversationSlug: z.string().describe('Unique conversation slug'),
      subject: z.string().nullable().describe('Conversation subject'),
      status: z.number().describe('Conversation status code'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
      authorName: z.string().nullable().optional().describe('Customer name'),
      authorEmail: z.string().nullable().optional().describe('Customer email'),
      assignee: z.string().nullable().optional().describe('Assigned staff member'),
      channelName: z.string().nullable().optional().describe('Channel name'),
      tagList: z.array(z.string()).optional().describe('Tags on the conversation')
    })
  )
  .output(
    z.object({
      conversationSlug: z.string().describe('Unique conversation slug'),
      subject: z.string().nullable().describe('Conversation subject'),
      status: z
        .number()
        .describe('Status code: 0=Open, 1=Responded, 2=Done, 3=Spam, 4=Archived, 5=On Hold'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().optional().describe('ISO 8601 last update timestamp'),
      authorName: z.string().nullable().optional().describe('Customer name'),
      authorEmail: z.string().nullable().optional().describe('Customer email'),
      assignee: z.string().nullable().optional().describe('Assigned staff member'),
      channelName: z.string().nullable().optional().describe('Channel name'),
      tagList: z.array(z.string()).optional().describe('Tags on the conversation')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        loginEmail: ctx.auth.loginEmail,
        brandSubdomain: ctx.config.brandSubdomain
      });

      let lastPolledAt = (ctx.state as any)?.lastPolledAt as string | undefined;

      let result = await client.listConversations({
        sort: 'changed',
        startDate: lastPolledAt
      });

      let conversations = result.conversations || [];
      let now = new Date().toISOString();

      let inputs = conversations.map((c: any) => ({
        conversationSlug: c.slug,
        subject: c.subject,
        status: c.status,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        authorName: c.author?.name,
        authorEmail: c.author?.email,
        assignee: c.assignee,
        channelName: c.category?.name,
        tagList: c.tag_list || []
      }));

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'conversation.updated',
        id: `${ctx.input.conversationSlug}-${ctx.input.updatedAt || ctx.input.createdAt}`,
        output: {
          conversationSlug: ctx.input.conversationSlug,
          subject: ctx.input.subject,
          status: ctx.input.status,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          authorName: ctx.input.authorName,
          authorEmail: ctx.input.authorEmail,
          assignee: ctx.input.assignee,
          channelName: ctx.input.channelName,
          tagList: ctx.input.tagList
        }
      };
    }
  })
  .build();
