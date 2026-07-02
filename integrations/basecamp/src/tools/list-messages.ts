import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.number().describe('Unique identifier of the message'),
  subject: z.string().describe('Subject/title of the message'),
  content: z.string().nullable().describe('Body content of the message'),
  status: z.string().describe('Status of the message'),
  createdAt: z.string().describe('When the message was created'),
  updatedAt: z.string().describe('When the message was last updated'),
  creatorName: z.string().nullable().describe('Name of the message creator'),
  commentsCount: z.number().describe('Number of comments on the message')
});

export let listMessagesTool = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `List messages from a Basecamp project's message board. Returns a paginated list of active messages.`,
  instructions: ['Use Get Project to find the message_board dock item and its ID.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project (bucket)'),
      messageBoardId: z.string().describe('ID of the message board (found in project dock)')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('List of messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let messages = await client.listMessages(ctx.input.projectId, ctx.input.messageBoardId);

    let mapped = messages.map((m: any) => ({
      messageId: m.id,
      subject: m.subject,
      content: m.content ?? null,
      status: m.status,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      creatorName: m.creator?.name ?? null,
      commentsCount: m.comments_count ?? 0
    }));

    return {
      output: { messages: mapped },
      message: `Found **${mapped.length}** message(s).`
    };
  })
  .build();
