import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getResource } from '../lib/response';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Retrieve one tracking project or group, including its numeric project ID, tags, keyword counts, and settings. Call list_projects to discover project names. For groups use the full Parent[sub]Child name.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectName: z
        .string()
        .describe('Project name from list_projects, including [sub] for groups')
    })
  )
  .output(z.object({ project: z.record(z.string(), z.any()), rawResponse: z.any() }))
  .handleInvocation(async ctx => {
    let response = await new Client({ token: ctx.auth.token }).getProject(
      ctx.input.projectName
    );
    return {
      message: 'Retrieved project details.',
      output: { project: getResource(response), rawResponse: response }
    };
  })
  .build();
