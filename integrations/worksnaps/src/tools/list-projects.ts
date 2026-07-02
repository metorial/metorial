import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Retrieve all projects accessible to the authenticated user. Optionally includes user assignment details for each project, showing which users are assigned and their roles.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeUserAssignments: z
        .boolean()
        .optional()
        .describe('Include user assignment details for each project')
    })
  )
  .output(
    z.object({
      projects: z.array(z.record(z.string(), z.unknown())).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let projects = await client.listProjects(ctx.input.includeUserAssignments);

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
