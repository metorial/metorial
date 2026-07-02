import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMessageTool = SlateTool.create(spec, {
  name: 'Manage Message',
  key: 'manage_message',
  description: `Create or update a message on a Basecamp project's message board.
To **create**, provide the \`projectId\`, \`messageBoardId\`, and \`subject\`.
To **update**, provide the \`projectId\`, \`messageId\`, and the fields to change.`,
  instructions: ['Use Get Project to find the message_board dock item and its ID.']
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project (bucket)'),
      action: z.enum(['create', 'update']).describe('Action to perform'),
      messageBoardId: z
        .string()
        .optional()
        .describe('ID of the message board (required for create, found in project dock)'),
      messageId: z.string().optional().describe('ID of the message (required for update)'),
      subject: z.string().optional().describe('Subject/title of the message'),
      content: z.string().optional().describe('Body of the message (supports HTML)'),
      categoryId: z.number().optional().describe('Message type/category ID')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('ID of the message'),
      subject: z.string().describe('Subject of the message'),
      content: z.string().nullable().describe('Body content of the message'),
      status: z.string().describe('Status of the message'),
      createdAt: z.string().describe('When the message was created'),
      creatorName: z.string().nullable().describe('Name of the message creator')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let { action, projectId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.messageBoardId)
        throw new Error('messageBoardId is required for creating a message');
      if (!ctx.input.subject) throw new Error('subject is required for creating a message');

      let message = await client.createMessage(projectId, ctx.input.messageBoardId, {
        subject: ctx.input.subject,
        content: ctx.input.content,
        categoryId: ctx.input.categoryId
      });

      return {
        output: {
          messageId: message.id,
          subject: message.subject,
          content: message.content ?? null,
          status: message.status,
          createdAt: message.created_at,
          creatorName: message.creator?.name ?? null
        },
        message: `Created message **${message.subject}**.`
      };
    }

    // update
    if (!ctx.input.messageId) throw new Error('messageId is required for updating a message');

    let message = await client.updateMessage(projectId, ctx.input.messageId, {
      subject: ctx.input.subject,
      content: ctx.input.content,
      categoryId: ctx.input.categoryId
    });

    return {
      output: {
        messageId: message.id,
        subject: message.subject,
        content: message.content ?? null,
        status: message.status,
        createdAt: message.created_at,
        creatorName: message.creator?.name ?? null
      },
      message: `Updated message **${message.subject}**.`
    };
  })
  .build();
