import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.number().describe('Project ID'),
  projectName: z.string().optional().describe('Project name'),
  description: z.string().optional().describe('Project description'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects in CentralStationCRM with pagination.`,
  constraints: ['Maximum 250 results per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page (max 250)')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects'),
      count: z.number().describe('Number of projects returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.listProjects({
      page: ctx.input.page,
      perpage: ctx.input.perPage
    });

    let items = Array.isArray(result) ? result : [];
    let projects = items.map((item: any) => {
      let project = item?.project ?? item;
      return {
        projectId: project.id,
        projectName: project.name,
        description: project.description,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      };
    });

    return {
      output: {
        projects,
        count: projects.length
      },
      message: `Found **${projects.length}** projects.`
    };
  })
  .build();
