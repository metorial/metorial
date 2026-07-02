import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in the Leiga workspace. Returns project names, keys, IDs, and archive status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.number().describe('Project ID'),
          projectName: z.string().describe('Project name'),
          projectKey: z.string().describe('Project key'),
          archived: z.boolean().describe('Whether the project is archived')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.listProjects();

    let projects = (response.data || []).map(p => ({
      projectId: p.id,
      projectName: p.pname,
      projectKey: p.pkey,
      archived: p.archived === 1
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
