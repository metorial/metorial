import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Lists all projects in Rocketlane with pagination support. Returns project summaries including name, status, dates, and archival state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Pagination offset (number of records to skip)'),
      limit: z.number().optional().describe('Maximum number of projects to return')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.number().describe('Project ID'),
            projectName: z.string().describe('Project name'),
            createdAt: z.number().optional().describe('Creation timestamp (epoch ms)'),
            updatedAt: z.number().optional().describe('Last update timestamp (epoch ms)'),
            archived: z.boolean().optional().describe('Whether the project is archived'),
            status: z.any().optional().describe('Project status'),
            startDate: z.string().nullable().optional().describe('Start date'),
            dueDate: z.string().nullable().optional().describe('Due date')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listProjects({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let projects = Array.isArray(result) ? result : (result.projects ?? result.data ?? []);

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
