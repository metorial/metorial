import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createConversation = SlateTool.create(spec, {
  name: 'Create Conversation',
  key: 'create_conversation',
  description: `Creates a new conversation within a Rocketlane project. Conversations are threaded discussions that can include project members.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project to create the conversation in'),
      title: z.string().describe('Title of the conversation'),
      body: z.string().optional().describe('Initial message body (HTML supported)'),
      members: z
        .array(
          z.object({
            emailId: z.string().optional().describe('Email of the member'),
            userId: z.number().optional().describe('User ID of the member')
          })
        )
        .optional()
        .describe('Members to include in the conversation')
    })
  )
  .output(
    z.object({
      conversationId: z.number().describe('Unique ID of the created conversation'),
      title: z.string().optional().describe('Conversation title'),
      projectId: z.number().optional().describe('Project ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createConversation({
      projectId: ctx.input.projectId,
      title: ctx.input.title,
      body: ctx.input.body,
      members: ctx.input.members
    });

    return {
      output: result,
      message: `Conversation **${ctx.input.title}** created successfully (ID: ${result.conversationId}).`
    };
  })
  .build();

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `Lists conversations in a Rocketlane project with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('Filter conversations by project ID'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of conversations to return')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            conversationId: z.number().describe('Conversation ID'),
            title: z.string().optional().describe('Conversation title'),
            projectId: z.number().optional().describe('Project ID'),
            createdAt: z.number().optional().describe('Creation timestamp (epoch ms)')
          })
        )
        .describe('List of conversations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listConversations({
      projectId: ctx.input.projectId,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let conversations = Array.isArray(result)
      ? result
      : (result.conversations ?? result.data ?? []);

    return {
      output: { conversations },
      message: `Found **${conversations.length}** conversation(s).`
    };
  })
  .build();

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Creates a comment on a conversation or task in Rocketlane. Specify either a conversation ID or task ID to target the comment.`,
  instructions: ['Provide either conversationId or taskId, not both.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z.number().optional().describe('ID of the conversation to comment on'),
      taskId: z.number().optional().describe('ID of the task to comment on'),
      body: z.string().describe('Comment body (HTML supported)')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('Unique ID of the created comment'),
      body: z.string().optional().describe('Comment body')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createComment({
      conversationId: ctx.input.conversationId,
      taskId: ctx.input.taskId,
      body: ctx.input.body
    });

    let target = ctx.input.conversationId
      ? `conversation ${ctx.input.conversationId}`
      : `task ${ctx.input.taskId}`;

    return {
      output: result,
      message: `Comment added to ${target} (ID: ${result.commentId}).`
    };
  })
  .build();

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Lists comments on a conversation or task in Rocketlane.`,
  instructions: ['Provide either conversationId or taskId to filter comments.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversationId: z.number().optional().describe('ID of the conversation'),
      taskId: z.number().optional().describe('ID of the task')
    })
  )
  .output(
    z.object({
      comments: z
        .array(
          z.object({
            commentId: z.number().describe('Comment ID'),
            body: z.string().optional().describe('Comment body'),
            createdAt: z.number().optional().describe('Creation timestamp (epoch ms)'),
            createdBy: z.any().optional().describe('User who created the comment')
          })
        )
        .describe('List of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getComments({
      conversationId: ctx.input.conversationId,
      taskId: ctx.input.taskId
    });

    let comments = Array.isArray(result) ? result : (result.comments ?? result.data ?? []);

    return {
      output: { comments },
      message: `Found **${comments.length}** comment(s).`
    };
  })
  .build();
