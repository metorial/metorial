import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve all projects in the workspace. Returns a summary list of projects with their IDs and names. Use **Get Project** for full project details including dates, users, and description.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Unique project identifier'),
          projectName: z.string().describe('Name of the project')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let projects = await client.listProjects();

    let mapped = (Array.isArray(projects) ? projects : []).map((p: any) => ({
      projectId: p.projectId ?? '',
      projectName: p.projectName ?? p.name ?? ''
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s) in the workspace.`
    };
  })
  .build();
