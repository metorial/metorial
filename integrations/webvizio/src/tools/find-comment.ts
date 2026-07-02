import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let findComment = SlateTool.create(spec, {
  name: 'Find Comment',
  key: 'find_comment',
  description: `Finds a comment in Webvizio by its ID or external ID. Returns the comment content, author, and associated task information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      commentId: z.number().optional().describe('Webvizio internal comment ID'),
      externalId: z.string().optional().describe('External identifier assigned to the comment')
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

    let comment = await client.findComment({
      commentId: ctx.input.commentId,
      externalId: ctx.input.externalId
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
      message: `Found comment (ID: ${comment.id}) on task ${comment.taskId} by ${comment.author}`
    };
  })
  .build();
