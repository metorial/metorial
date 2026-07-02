import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List Jira projects accessible to the authenticated user. Supports pagination for large project lists.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startAt: z.number().optional().default(0).describe('Pagination start index.'),
      maxResults: z.number().optional().default(50).describe('Maximum projects to return.')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of accessible projects.'),
      projects: z.array(
        z.object({
          projectId: z.string().describe('The project ID.'),
          projectKey: z.string().describe('The project key.'),
          name: z.string().describe('The project name.'),
          projectType: z.string().optional().describe('The project type key.'),
          style: z
            .string()
            .optional()
            .describe('The project style (e.g., "classic", "next-gen").'),
          isPrivate: z.boolean().optional().describe('Whether the project is private.'),
          leadAccountId: z.string().optional().describe('Account ID of the project lead.'),
          leadDisplayName: z.string().optional().describe('Display name of the project lead.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let result = await client.getProjects({
      startAt: ctx.input.startAt,
      maxResults: ctx.input.maxResults
    });

    let projects = (result.values ?? []).map((p: any) => ({
      projectId: p.id,
      projectKey: p.key,
      name: p.name,
      projectType: p.projectTypeKey,
      style: p.style,
      isPrivate: p.isPrivate,
      leadAccountId: p.lead?.accountId,
      leadDisplayName: p.lead?.displayName
    }));

    return {
      output: {
        total: result.total,
        projects
      },
      message: `Found **${result.total}** projects. Returned ${projects.length}.`
    };
  })
  .build();
