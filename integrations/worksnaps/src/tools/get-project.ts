import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve details for a specific project by its ID. Optionally includes user assignment information showing who is assigned to the project and their roles.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project to retrieve'),
      includeUserAssignments: z
        .boolean()
        .optional()
        .describe('Include user assignment details for the project')
    })
  )
  .output(
    z.object({
      project: z.record(z.string(), z.unknown()).describe('Project details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let project = await client.getProject(
      ctx.input.projectId,
      ctx.input.includeUserAssignments
    );

    return {
      output: { project },
      message: `Retrieved project **${project.name || ctx.input.projectId}**.`
    };
  })
  .build();
