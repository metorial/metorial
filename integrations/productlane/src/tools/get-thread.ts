import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.object({
  tagId: z.string().describe('Tag ID'),
  name: z.string().describe('Tag name'),
  color: z.string().nullable().describe('Tag color')
});

export let getThread = SlateTool.create(spec, {
  name: 'Get Thread',
  key: 'get_thread',
  description: `Retrieve detailed information about a specific feedback thread, including contact, company, assignee, tags, and optionally the full conversation history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to retrieve'),
      includeConversation: z
        .boolean()
        .optional()
        .describe('Include the full conversation history')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('Unique ID of the thread'),
      title: z.string().nullable().describe('Thread title'),
      text: z.string().describe('Thread body text'),
      painLevel: z.string().describe('Pain level'),
      state: z.string().describe('Thread state'),
      origin: z.string().describe('Source of the thread'),
      contactId: z.string().nullable().describe('Associated contact ID'),
      contactEmail: z.string().nullable().describe('Contact email'),
      contactName: z.string().nullable().describe('Contact name'),
      companyId: z.string().nullable().describe('Associated company ID'),
      companyName: z.string().nullable().describe('Associated company name'),
      assigneeId: z.string().nullable().describe('Assigned member ID'),
      assigneeName: z.string().nullable().describe('Assigned member name'),
      tags: z.array(tagSchema).describe('Tags applied to the thread'),
      conversation: z
        .array(z.any())
        .optional()
        .describe('Full conversation history (when requested)'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let t = await client.getThread(ctx.input.threadId, ctx.input.includeConversation);

    let tags = (t.tags || []).map((tag: any) => ({
      tagId: tag.id,
      name: tag.name,
      color: tag.color ?? null
    }));

    return {
      output: {
        threadId: t.id,
        title: t.title ?? null,
        text: t.text,
        painLevel: t.painLevel,
        state: t.state,
        origin: t.origin,
        contactId: t.contactId ?? null,
        contactEmail: t.contact?.email ?? null,
        contactName: t.contact?.name ?? null,
        companyId: t.companyId ?? null,
        companyName: t.company?.name ?? null,
        assigneeId: t.assigneeId ?? null,
        assigneeName: t.assignee?.name ?? null,
        tags,
        conversation: t.conversation,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      },
      message: `Retrieved thread **${t.title || t.id}** (state: ${t.state}, pain: ${t.painLevel}).`
    };
  })
  .build();
