import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredString, requireRecords } from '../lib/response';
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
      raw: z
        .unknown()
        .optional()
        .describe(
          'Complete provider response, including values without a compatible summary field'
        ),
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

    let mapped = requireRecords(projects).map(item => ({
      projectId: requiredString(item.projectId, 'projectId'),
      projectName: requiredString(item.projectName, 'projectName')
    }));

    return {
      output: { projects: mapped, raw: projects },
      message: `Found **${mapped.length}** project(s) in the workspace.`
    };
  })
  .build();
