import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the Azure DevOps organization. Returns project names, IDs, descriptions, and states. Use to discover available projects before performing other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      stateFilter: z
        .enum([
          'all',
          'createPending',
          'deleted',
          'deleting',
          'new',
          'unchanged',
          'wellFormed'
        ])
        .optional()
        .describe('Filter by project state'),
      top: z.number().optional().describe('Maximum number of projects to return'),
      skip: z.number().optional().describe('Number of projects to skip')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string(),
          projectName: z.string(),
          description: z.string().optional(),
          state: z.string(),
          url: z.string(),
          lastUpdateTime: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });

    let result = await client.listProjects({
      top: ctx.input.top,
      skip: ctx.input.skip,
      stateFilter: ctx.input.stateFilter
    });

    let projects = (result.value || []).map((p: any) => ({
      projectId: p.id,
      projectName: p.name,
      description: p.description,
      state: p.state,
      url: p.url,
      lastUpdateTime: p.lastUpdateTime
    }));

    return {
      output: { projects, count: result.count ?? projects.length },
      message: `Found **${projects.length}** projects in the organization.`
    };
  })
  .build();
