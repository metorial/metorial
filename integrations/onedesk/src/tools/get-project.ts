import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description:
    'Retrieve project details by external ID. Use the ID returned by create_project or discover it with search_projects. Requires an API key connection.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      externalId: z
        .string()
        .min(1)
        .describe('Project external ID returned by create_project or search_projects.')
    })
  )
  .output(
    z.object({
      project: z
        .record(z.string(), z.unknown())
        .describe('Project details, including identifiers, name, and state.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let project = await client.getProject(ctx.input.externalId);
    return { output: { project }, message: `Retrieved project \`${ctx.input.externalId}\`.` };
  })
  .build();
