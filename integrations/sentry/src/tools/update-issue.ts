import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateIssueTool = SlateTool.create(spec, {
  name: 'Update Issue',
  key: 'update_issue',
  description: `Update a Sentry issue's status, assignment, bookmark state, or other properties. Use this to resolve, ignore, assign, or triage issues.`,
  instructions: [
    'Set status to "resolved", "unresolved", or "ignored"',
    'assignedTo accepts a user email, "me", a team slug prefixed with "#" (e.g. "#backend-team"), or empty string to unassign'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      issueId: z.string().describe('The issue ID to update'),
      status: z
        .enum(['resolved', 'unresolved', 'ignored'])
        .optional()
        .describe('New status for the issue'),
      substatus: z
        .enum([
          'archived_until_escalating',
          'archived_until_condition_met',
          'archived_forever'
        ])
        .optional()
        .describe('Substatus when ignoring an issue'),
      assignedTo: z
        .string()
        .optional()
        .describe('Assign to user email, "me", "#team-slug", or "" to unassign'),
      hasSeen: z.boolean().optional().describe('Mark the issue as seen/unseen'),
      isBookmarked: z.boolean().optional().describe('Bookmark or unbookmark the issue'),
      isPublic: z.boolean().optional().describe('Make the issue public or private')
    })
  )
  .output(
    z.object({
      issueId: z.string(),
      shortId: z.string(),
      title: z.string(),
      status: z.string(),
      substatus: z.string().optional(),
      assignedTo: z.any().optional(),
      isBookmarked: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let updateData: Record<string, any> = {};
    if (ctx.input.status !== undefined) updateData.status = ctx.input.status;
    if (ctx.input.substatus !== undefined) updateData.substatus = ctx.input.substatus;
    if (ctx.input.assignedTo !== undefined) updateData.assignedTo = ctx.input.assignedTo;
    if (ctx.input.hasSeen !== undefined) updateData.hasSeen = ctx.input.hasSeen;
    if (ctx.input.isBookmarked !== undefined) updateData.isBookmarked = ctx.input.isBookmarked;
    if (ctx.input.isPublic !== undefined) updateData.isPublic = ctx.input.isPublic;

    let issue = await client.updateIssue(ctx.input.issueId, updateData);

    let actions: string[] = [];
    if (ctx.input.status) actions.push(`status → ${ctx.input.status}`);
    if (ctx.input.assignedTo !== undefined)
      actions.push(`assigned → ${ctx.input.assignedTo || 'unassigned'}`);
    if (ctx.input.isBookmarked !== undefined)
      actions.push(ctx.input.isBookmarked ? 'bookmarked' : 'unbookmarked');

    return {
      output: {
        issueId: String(issue.id),
        shortId: issue.shortId || '',
        title: issue.title || '',
        status: issue.status,
        substatus: issue.substatus,
        assignedTo: issue.assignedTo,
        isBookmarked: issue.isBookmarked
      },
      message: `Updated issue **${issue.shortId}**: ${actions.join(', ')}.`
    };
  })
  .build();
