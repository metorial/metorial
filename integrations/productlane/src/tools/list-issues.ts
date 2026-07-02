import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let issueSchema = z.object({
  issueId: z.string().describe('Unique ID of the issue'),
  identifier: z.string().describe('Issue identifier (e.g. TEAM-123)'),
  title: z.string().describe('Issue title'),
  description: z.string().nullable().describe('Issue description'),
  status: z.string().describe('Issue status'),
  priority: z.number().describe('Issue priority'),
  team: z.string().describe('Team identifier'),
  projectId: z.string().nullable().describe('Parent project ID'),
  upvotes: z.number().describe('Number of upvotes'),
  importanceScore: z.number().describe('Importance score'),
  url: z.string().describe('Issue URL'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listIssues = SlateTool.create(spec, {
  name: 'List Portal Issues',
  key: 'list_issues',
  description: `List issues from the public portal. Issues represent individual work items within projects that customers can view and upvote.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID (uses config workspace if not provided)'),
      language: z.string().optional().describe('Language code for localized content')
    })
  )
  .output(
    z.object({
      issues: z.array(issueSchema).describe('List of portal issues')
    })
  )
  .handleInvocation(async ctx => {
    let workspaceId = ctx.input.workspaceId || ctx.config.workspaceId;
    if (!workspaceId) {
      throw new Error(
        'workspaceId is required. Provide it in the input or set it in the config.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listIssues(workspaceId, { language: ctx.input.language });

    let issues = (Array.isArray(result) ? result : result.issues || []).map((i: any) => ({
      issueId: i.id,
      identifier: i.identifier,
      title: i.title,
      description: i.description ?? null,
      status: i.status,
      priority: i.priority,
      team: i.team,
      projectId: i.projectId ?? null,
      upvotes: i.upvotes ?? 0,
      importanceScore: i.importanceScore ?? 0,
      url: i.url,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt
    }));

    return {
      output: { issues },
      message: `Found **${issues.length}** portal issues.`
    };
  })
  .build();
