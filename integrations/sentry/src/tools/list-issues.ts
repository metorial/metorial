import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { optionalBoolean, optionalNumber, optionalString } from '../lib/output';
import { spec } from '../spec';

export let listIssuesTool = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description: `Search and list issues in the Sentry organization. Supports Sentry's structured search query syntax for filtering by status, assignment, tags, and more.`,
  instructions: [
    'Use the query parameter with Sentry search syntax, e.g. "is:unresolved assigned:me" or "is:resolved level:error"',
    'Sort options include: "date" (last seen), "new" (first seen), "freq" (event count), "priority"'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Sentry search query (e.g. "is:unresolved assigned:me level:error")'),
      projectSlug: z.string().optional().describe('Filter by project slug'),
      projectIds: z
        .array(z.number())
        .optional()
        .describe('Filter by Sentry numeric project IDs'),
      sort: z
        .enum(['date', 'new', 'freq', 'priority'])
        .optional()
        .describe('Sort order for results'),
      statsPeriod: z.string().optional().describe('Stats period (e.g. "24h", "14d")'),
      cursor: z.string().optional().describe('Pagination cursor for fetching next page')
    })
  )
  .output(
    z.object({
      issues: z.array(
        z.object({
          issueId: z.string().describe('Unique issue ID'),
          shortId: z.string().describe('Short human-readable ID (e.g. PROJECT-123)'),
          title: z.string().describe('Issue title'),
          culprit: z.string().optional().describe('Culprit (function or route)'),
          level: z.string().describe('Issue severity level'),
          status: z.string().describe('Issue status (unresolved, resolved, ignored)'),
          statusDetails: z.any().optional().describe('Additional status details'),
          isPublic: z.boolean().optional(),
          isBookmarked: z.boolean().optional(),
          platform: z.string().optional(),
          projectSlug: z.string().optional().describe('Project slug'),
          projectName: z.string().optional().describe('Project name'),
          count: z.string().optional().describe('Number of events'),
          userCount: z.number().optional().describe('Number of affected users'),
          firstSeen: z.string().optional().describe('When the issue was first seen'),
          lastSeen: z.string().optional().describe('When the issue was last seen'),
          assignedTo: z.any().optional().describe('Assigned user or team'),
          permalink: z.string().optional().describe('Link to issue in Sentry UI')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let issues = await client.listIssues({
      query: ctx.input.query,
      project: ctx.input.projectSlug,
      projectIds: ctx.input.projectIds,
      sort: ctx.input.sort,
      statsPeriod: ctx.input.statsPeriod,
      cursor: ctx.input.cursor
    });

    let mapped = (issues || []).map((issue: any) => ({
      issueId: String(issue.id),
      shortId: optionalString(issue.shortId) ?? '',
      title: optionalString(issue.title) ?? '',
      culprit: optionalString(issue.culprit),
      level: optionalString(issue.level) ?? 'error',
      status: optionalString(issue.status) ?? 'unresolved',
      statusDetails: issue.statusDetails,
      isPublic: optionalBoolean(issue.isPublic),
      isBookmarked: optionalBoolean(issue.isBookmarked),
      platform: optionalString(issue.platform),
      projectSlug: optionalString(issue.project?.slug),
      projectName: optionalString(issue.project?.name),
      count: optionalString(issue.count),
      userCount: optionalNumber(issue.userCount),
      firstSeen: optionalString(issue.firstSeen),
      lastSeen: optionalString(issue.lastSeen),
      assignedTo: issue.assignedTo,
      permalink: optionalString(issue.permalink)
    }));

    return {
      output: { issues: mapped },
      message: `Found **${mapped.length}** issues${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
