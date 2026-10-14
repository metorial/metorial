import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentProject = SlateTool.create(spec, {
  name: 'Get Current Environment',
  key: 'get_current_project',
  description:
    'Retrieve the UUID and name of the Refiner environment connected to the current API key. Use this to confirm which environment your tools operate in.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      projectUuid: z.string().describe('UUID of the connected environment'),
      projectName: z.string().describe('Name of the connected environment')
    })
  )
  .handleInvocation(async ctx => {
    let project = await new RefinerClient({ token: ctx.auth.token }).getCurrentProject();
    return {
      output: { projectUuid: project.project_uuid, projectName: project.project_name },
      message: `Connected to environment **${project.project_name}** (${project.project_uuid}).`
    };
  })
  .build();
