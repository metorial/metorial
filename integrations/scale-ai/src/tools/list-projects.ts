import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all annotation projects in your Scale AI account. Optionally filter by archive status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      archived: z
        .boolean()
        .optional()
        .describe('Filter by archive status. If omitted, returns all projects.')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z
            .object({
              projectName: z.string().describe('Name of the project'),
              taskType: z
                .string()
                .optional()
                .describe('Task type associated with the project'),
              createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
            })
            .passthrough()
        )
        .describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listProjects({
      archived: ctx.input.archived
    });

    let projects = Array.isArray(result) ? result : (result.docs ?? []);

    let mapped = projects.map((p: any) => ({
      projectName: p.name,
      taskType: p.type,
      createdAt: p.created_at,
      ...p
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
