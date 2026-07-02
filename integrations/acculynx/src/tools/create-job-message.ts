import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createJobMessageTool = SlateTool.create(spec, {
  name: 'Create Job Message',
  key: 'create_job_message',
  description: `Create a new message on a job record or reply to an existing message. Messages are used for internal communication and notes on a job.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobId: z.string().describe('The unique ID of the job'),
      body: z.string().describe('Message body content'),
      subject: z.string().optional().describe('Message subject (for new messages)'),
      replyToMessageId: z
        .string()
        .optional()
        .describe(
          'Message ID to reply to. If provided, creates a reply instead of a new message.'
        )
    })
  )
  .output(
    z.object({
      message: z.record(z.string(), z.any()).describe('The created message or reply')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.replyToMessageId) {
      result = await client.replyToJobMessage(ctx.input.jobId, ctx.input.replyToMessageId, {
        body: ctx.input.body
      });
      return {
        output: { message: result },
        message: `Replied to message **${ctx.input.replyToMessageId}** on job **${ctx.input.jobId}**.`
      };
    }

    result = await client.createJobMessage(ctx.input.jobId, {
      subject: ctx.input.subject,
      body: ctx.input.body
    });

    return {
      output: { message: result },
      message: `Created new message on job **${ctx.input.jobId}**.`
    };
  })
  .build();
