import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Creates a new comment on a task in Webvizio. Comments are threaded discussions or feedback on individual tasks. Identify the parent task by its ID or external ID.`,
  instructions: [
    'Identify the parent task using either taskId or taskExternalId.',
    'The comment body supports HTML format.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskId: z.number().optional().describe('Webvizio task ID to comment on'),
      taskExternalId: z.string().optional().describe('External ID of the task to comment on'),
      externalId: z
        .string()
        .optional()
        .describe('External identifier for syncing with your system'),
      author: z.string().optional().describe('Email address of the comment author'),
      body: z.string().describe('Comment text (supports HTML format)')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('Webvizio comment ID'),
      externalId: z.string().nullable().describe('External identifier'),
      taskId: z.number().describe('Parent task ID'),
      taskExternalId: z.string().nullable().describe('Parent task external ID'),
      author: z.string().describe('Comment author email'),
      body: z.string().describe('Comment text'),
      bodyHtml: z.string().nullable().describe('Comment text in HTML format'),
      createdAt: z.string().describe('Creation timestamp in ISO8601 format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let comment = await client.createComment({
      taskId: ctx.input.taskId,
      taskExternalId: ctx.input.taskExternalId,
      externalId: ctx.input.externalId,
      author: ctx.input.author,
      body: ctx.input.body
    });

    return {
      output: {
        commentId: comment.id,
        externalId: comment.externalId,
        taskId: comment.taskId,
        taskExternalId: comment.taskExternalId,
        author: comment.author,
        body: comment.body,
        bodyHtml: comment.bodyHtml,
        createdAt: comment.createdAt
      },
      message: `Created comment (ID: ${comment.id}) on task ${comment.taskId} by ${comment.author}`
    };
  })
  .build();
