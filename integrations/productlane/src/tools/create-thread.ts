import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createThread = SlateTool.create(spec, {
  name: 'Create Thread',
  key: 'create_thread',
  description: `Create a new feedback thread (insight) in Productlane. Threads capture customer feedback, support conversations, and feature requests. Each thread must be associated with a contact email and includes a pain level to indicate severity.`,
  instructions: [
    'painLevel is required and must be one of: UNKNOWN, LOW, MEDIUM, HIGH.',
    'contactEmail is required — the contact will be created if it does not already exist.'
  ]
})
  .input(
    z.object({
      text: z.string().describe('Feedback text content'),
      painLevel: z
        .enum(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'])
        .describe('Severity/pain level of the feedback'),
      contactEmail: z.string().describe('Email address of the contact submitting feedback'),
      title: z.string().optional().describe('Thread title'),
      state: z
        .enum(['NEW', 'PROCESSED', 'COMPLETED', 'SNOOZED', 'UNSNOOZED'])
        .optional()
        .describe('Initial thread state (defaults to NEW)'),
      origin: z
        .string()
        .optional()
        .describe('Source of the feedback (e.g. API, SLACK, EMAIL, PORTAL)'),
      contactName: z.string().optional().describe('Contact name'),
      assigneeId: z.string().optional().describe('Workspace member ID to assign'),
      projectId: z.string().optional().describe('Link to a project'),
      issueId: z.string().optional().describe('Link to a Linear issue'),
      companyId: z.string().optional().describe('Link to a company'),
      notifySlack: z.boolean().optional().describe('Send Slack notification'),
      notifyEmail: z.boolean().optional().describe('Send email notification')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('ID of the created thread'),
      title: z.string().nullable().describe('Thread title'),
      state: z.string().describe('Thread state'),
      painLevel: z.string().describe('Pain level'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let { notifySlack, notifyEmail, ...rest } = ctx.input;
    let notify =
      notifySlack !== undefined || notifyEmail !== undefined
        ? { slack: notifySlack, email: notifyEmail }
        : undefined;

    let client = new Client({ token: ctx.auth.token });
    let result = await client.createThread({ ...rest, notify });

    return {
      output: {
        threadId: result.id,
        title: result.title ?? null,
        state: result.state,
        painLevel: result.painLevel,
        createdAt: result.createdAt
      },
      message: `Created thread **${result.title || result.id}** (pain: ${result.painLevel}).`
    };
  })
  .build();
