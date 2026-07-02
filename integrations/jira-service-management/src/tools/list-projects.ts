import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List Jira projects accessible to the authenticated user. Returns project keys, names, types, and lead information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startAt: z.number().optional().describe('Starting index for pagination'),
      maxResults: z.number().optional().describe('Maximum number of results (default: 50)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of accessible projects'),
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique project ID'),
            projectKey: z.string().describe('Project key'),
            projectName: z.string().describe('Project name'),
            projectType: z
              .string()
              .optional()
              .describe('Project type key (e.g., "service_desk", "software")'),
            leadAccountId: z.string().optional().describe('Account ID of the project lead'),
            leadName: z.string().optional().describe('Display name of the project lead')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let result = await client.getProjects(ctx.input.startAt, ctx.input.maxResults);

    let projects = (result.values || []).map((p: any) => ({
      projectId: p.id,
      projectKey: p.key,
      projectName: p.name,
      projectType: p.projectTypeKey,
      leadAccountId: p.lead?.accountId,
      leadName: p.lead?.displayName
    }));

    return {
      output: {
        total: result.total || projects.length,
        projects
      },
      message: `Found **${projects.length}** projects.`
    };
  })
  .build();
