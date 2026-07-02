import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in your Promptmate.io account. Projects help organize and manage your apps within the platform.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique identifier for the project'),
            projectName: z.string().describe('Name of the project')
          })
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let projects = await client.listProjects();

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
