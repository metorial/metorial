import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique ID of the project'),
  name: z.string().describe('Name of the project'),
  teamId: z.string().optional().describe('ID of the team this project belongs to'),
  createdAt: z.string().optional().describe('When the project was created'),
  modifiedAt: z.string().optional().describe('When the project was last modified'),
  isPinned: z.boolean().optional().describe('Whether the project is pinned')
});

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects within a team. Projects are containers for grouping design files.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to list projects for')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let projects = await client.getProjects(ctx.input.teamId);

    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      teamId: p['team-id'] ?? p.teamId,
      createdAt: p['created-at'] ?? p.createdAt,
      modifiedAt: p['modified-at'] ?? p.modifiedAt,
      isPinned: p['is-pinned'] ?? p.isPinned
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s) in the team.`
    };
  })
  .build();
