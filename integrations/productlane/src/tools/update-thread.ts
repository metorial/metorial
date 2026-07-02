import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateThread = SlateTool.create(spec, {
  name: 'Update Thread',
  key: 'update_thread',
  description: `Update an existing feedback thread. You can change the title, text, pain level, state, assignee, linked project, tags, or other properties. Only provided fields will be updated.`,
  instructions: [
    'Set assigneeId to null to unassign the thread.',
    'tagIds replaces all existing tags on the thread.'
  ]
})
  .input(
    z.object({
      threadId: z.string().describe('ID of the thread to update'),
      text: z.string().optional().describe('Updated feedback text'),
      title: z.string().optional().describe('Updated title'),
      painLevel: z
        .enum(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH'])
        .optional()
        .describe('Updated pain level'),
      state: z
        .enum(['NEW', 'PROCESSED', 'COMPLETED', 'SNOOZED', 'UNSNOOZED'])
        .optional()
        .describe('Updated state'),
      assigneeId: z
        .string()
        .nullable()
        .optional()
        .describe('Workspace member ID to assign, or null to unassign'),
      projectId: z.string().optional().describe('Link to a project'),
      contactId: z.string().optional().describe('Update associated contact'),
      companyId: z.string().optional().describe('Update associated company'),
      tagIds: z.array(z.string()).optional().describe('Replace tags with these tag IDs'),
      notifySlack: z.boolean().optional().describe('Send Slack notification'),
      notifyEmail: z.boolean().optional().describe('Send email notification')
    })
  )
  .output(
    z.object({
      threadId: z.string().describe('ID of the updated thread'),
      title: z.string().nullable().describe('Thread title'),
      state: z.string().describe('Thread state'),
      painLevel: z.string().describe('Pain level'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let { threadId, notifySlack, notifyEmail, ...rest } = ctx.input;
    let notify =
      notifySlack !== undefined || notifyEmail !== undefined
        ? { slack: notifySlack, email: notifyEmail }
        : undefined;

    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateThread(threadId, { ...rest, notify });

    return {
      output: {
        threadId: result.id,
        title: result.title ?? null,
        state: result.state,
        painLevel: result.painLevel,
        updatedAt: result.updatedAt
      },
      message: `Updated thread **${result.title || result.id}** (state: ${result.state}).`
    };
  })
  .build();
