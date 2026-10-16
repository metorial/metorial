import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjectLocations = SlateTool.create(spec, {
  name: 'List Project Locations',
  key: 'list_project_locations',
  description:
    'Lists the locations belonging to a StoreRocket project. Call list_projects to discover authorized project IDs. Retains the complete provider response with location identifiers and details when returned.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      projectId: z
        .string()
        .describe('Project ID. Call list_projects to discover authorized project IDs.')
    })
  )
  .output(
    z.object({
      locations: z
        .any()
        .describe(
          'Complete project location-list response with IDs and location details when returned'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    return {
      output: { locations: await client.getProjectLocations(ctx.input.projectId) },
      message: 'Retrieved StoreRocket project locations.'
    };
  })
  .build();
