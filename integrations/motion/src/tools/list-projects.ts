import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects in Motion with optional workspace filtering. Returns project details including status, custom field values, and timestamps. Use the cursor for pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().optional().describe('Filter projects to a specific workspace'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique identifier of the project'),
            name: z.string().describe('Name of the project'),
            description: z.string().optional().describe('HTML description'),
            workspaceId: z.string().optional().describe('Workspace ID'),
            status: z.any().optional().describe('Project status'),
            customFieldValues: z.any().optional().describe('Custom field values'),
            createdTime: z.string().optional().describe('When the project was created'),
            updatedTime: z.string().optional().describe('When the project was last updated')
          })
        )
        .describe('List of projects'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      pageSize: z.number().optional().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let result = await client.listProjects({
      workspaceId: ctx.input.workspaceId,
      cursor: ctx.input.cursor
    });

    let projects = (result.projects || []).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description,
      workspaceId: p.workspaceId,
      status: p.status,
      customFieldValues: p.customFieldValues,
      createdTime: p.createdTime,
      updatedTime: p.updatedTime
    }));

    return {
      output: {
        projects,
        nextCursor: result.meta?.nextCursor,
        pageSize: result.meta?.pageSize
      },
      message: `Found **${projects.length}** project(s)${result.meta?.nextCursor ? ' (more available)' : ''}`
    };
  })
  .build();
