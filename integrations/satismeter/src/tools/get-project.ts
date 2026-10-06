import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { projectIdSchema, resolveProject } from '../lib/contracts';
import { spec } from '../spec';

export const getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Verify access to an exact project and retrieve its ID and name. Find the project ID in the SatisMeter dashboard; the API does not list accessible projects or identify the human account owner.',
  tags: { readOnly: true }
})
  .input(z.object({ projectId: projectIdSchema }))
  .output(
    z.object({
      projectId: z.string().describe('Exact project ID'),
      name: z.string().describe('Project name')
    })
  )
  .handleInvocation(async ctx => {
    const project = await new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey).getProject(
      resolveProject(ctx.input.projectId, ctx.config)
    );
    return {
      output: { projectId: project.id, name: project.name },
      message: 'Verified access to the selected project.'
    };
  })
  .build();
