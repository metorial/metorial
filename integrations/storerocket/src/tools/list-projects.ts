import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description:
    'Lists the projects accessible to the authenticated StoreRocket account. Use the returned project IDs with list_project_locations to choose the store locator to read.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z
        .any()
        .describe(
          'Complete project-list response, including project IDs and names when returned'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    return {
      output: { projects: await client.getProjects() },
      message: 'Retrieved StoreRocket projects.'
    };
  })
  .build();
