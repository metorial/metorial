import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConversation = SlateTool.create(spec, {
  name: 'Get Conversation',
  key: 'get_conversation',
  description: `Retrieve detailed information about a specific conversation, including its messages, tags, assignee, and status. Optionally includes the conversation's messages.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation (e.g., cnv_abc123)'),
      includeMessages: z
        .boolean()
        .optional()
        .describe('Whether to also fetch conversation messages')
    })
  )
  .output(
    z.object({
      conversationId: z.string(),
      subject: z.string(),
      status: z.string(),
      assignee: z
        .object({
          teammateId: z.string(),
          email: z.string(),
          firstName: z.string(),
          lastName: z.string()
        })
        .optional(),
      isPrivate: z.boolean(),
      createdAt: z.number(),
      waitingSince: z.number().optional(),
      tags: z.array(
        z.object({
          tagId: z.string(),
          name: z.string()
        })
      ),
      links: z.array(
        z.object({
          linkId: z.string(),
          externalUrl: z.string(),
          name: z.string().optional()
        })
      ),
      messages: z
        .array(
          z.object({
            messageId: z.string(),
            type: z.string(),
            isInbound: z.boolean(),
            subject: z.string(),
            blurb: z.string(),
            body: z.string(),
            createdAt: z.number(),
            authorEmail: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let conversation = await client.getConversation(ctx.input.conversationId);

    let messages: any;
    if (ctx.input.includeMessages) {
      let msgResult = await client.listConversationMessages(ctx.input.conversationId);
      messages = msgResult._results.map(m => ({
        messageId: m.id,
        type: m.type,
        isInbound: m.is_inbound,
        subject: m.subject,
        blurb: m.blurb,
        body: m.body,
        createdAt: m.created_at,
        authorEmail: m.author?.email
      }));
    }

    return {
      output: {
        conversationId: conversation.id,
        subject: conversation.subject,
        status: conversation.status,
        assignee: conversation.assignee
          ? {
              teammateId: conversation.assignee.id,
              email: conversation.assignee.email,
              firstName: conversation.assignee.first_name,
              lastName: conversation.assignee.last_name
            }
          : undefined,
        isPrivate: conversation.is_private,
        createdAt: conversation.created_at,
        waitingSince: conversation.waiting_since,
        tags: conversation.tags.map(t => ({
          tagId: t.id,
          name: t.name
        })),
        links: conversation.links.map(l => ({
          linkId: l.id,
          externalUrl: l.external_url,
          name: l.name
        })),
        messages
      },
      message: `Retrieved conversation **"${conversation.subject}"** (status: ${conversation.status})${messages ? ` with ${messages.length} messages` : ''}.`
    };
  });
