import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireHookdeckInput } from '../lib/errors';
import { spec } from '../spec';

let issueSchema = z.object({
  issueId: z.string().describe('Issue ID'),
  teamId: z.string().describe('Team/project ID'),
  type: z.string().describe('Issue type (delivery, transformation, backpressure, request)'),
  status: z.string().describe('Issue status (OPENED, ACKNOWLEDGED, RESOLVED, IGNORED)'),
  reference: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Reference details for the issue'),
  firstSeenAt: z.string().describe('First occurrence timestamp'),
  lastSeenAt: z.string().describe('Last occurrence timestamp'),
  dismissedAt: z.string().nullable().optional().describe('Timestamp if dismissed'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let manageIssues = SlateTool.create(spec, {
  name: 'Manage Issues',
  key: 'manage_issues',
  description: `List, inspect, and update Hookdeck issues. Issues automatically track problems like delivery failures, transformation errors, and backpressure. Update their status to coordinate resolution with your team.`,
  instructions: [
    'Use action "list" to see all issues, optionally filtered by type or status.',
    'Use action "update_status" to change an issue status to ACKNOWLEDGED, RESOLVED, or IGNORED.',
    'Use action "dismiss" to hide an issue from the UI. Dismissed issues re-open on recurrence unless also IGNORED.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'update_status', 'dismiss'])
        .describe('Action to perform'),
      issueId: z
        .string()
        .optional()
        .describe('Issue ID (required for get, update_status, dismiss)'),
      status: z
        .enum(['OPENED', 'ACKNOWLEDGED', 'RESOLVED', 'IGNORED'])
        .optional()
        .describe('New status (for update_status) or filter (for list)'),
      type: z
        .enum(['delivery', 'transformation', 'backpressure', 'request'])
        .optional()
        .describe('Filter by issue type (for list)'),
      limit: z.number().optional().describe('Max results (for list)'),
      cursor: z.string().optional().describe('Pagination cursor (for list)')
    })
  )
  .output(
    z.object({
      issue: issueSchema.optional().describe('Single issue'),
      dismissedIssueId: z.string().optional().describe('Dismissed issue ID'),
      issues: z.array(issueSchema).optional().describe('List of issues'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapIssue = (i: any) => ({
      issueId: i.id as string,
      teamId: i.team_id as string,
      type: i.type as string,
      status: i.status as string,
      reference: i.reference as Record<string, unknown> | undefined,
      firstSeenAt: i.first_seen_at as string,
      lastSeenAt: i.last_seen_at as string,
      dismissedAt: (i.dismissed_at as string | null) ?? null,
      createdAt: i.created_at as string,
      updatedAt: i.updated_at as string
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listIssues({
          type: ctx.input.type,
          status: ctx.input.status,
          limit: ctx.input.limit,
          next: ctx.input.cursor
        });
        return {
          output: {
            issues: result.models.map(i => mapIssue(i)),
            totalCount: result.count,
            nextCursor: result.pagination.next
          },
          message: `Listed **${result.models.length}** issues (${result.count} total).`
        };
      }
      case 'get': {
        let issueId = requireHookdeckInput(ctx.input.issueId, 'issueId', 'get');
        let issue = await client.getIssue(issueId);
        return {
          output: { issue: mapIssue(issue) },
          message: `Retrieved issue \`${issue.id}\` — type: **${issue.type}**, status: **${issue.status}**.`
        };
      }
      case 'update_status': {
        let issueId = requireHookdeckInput(ctx.input.issueId, 'issueId', 'update_status');
        let status = requireHookdeckInput(ctx.input.status, 'status', 'update_status');
        let issue = await client.updateIssue(issueId, {
          status
        });
        return {
          output: { issue: mapIssue(issue) },
          message: `Updated issue \`${issue.id}\` status to **${issue.status}**.`
        };
      }
      case 'dismiss': {
        let issueId = requireHookdeckInput(ctx.input.issueId, 'issueId', 'dismiss');
        let result = await client.dismissIssue(issueId);
        return {
          output: { dismissedIssueId: result.id ?? issueId },
          message: `Dismissed issue \`${result.id ?? issueId}\`.`
        };
      }
    }
  })
  .build();
