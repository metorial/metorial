import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProjectRegions = SlateTool.create(spec, {
  name: 'Get Project Regions',
  key: 'get_project_regions',
  description: `List all tracked search regions for a project, including the Google region, language, and keyword counts per region. Useful for understanding the geographic scope of your keyword tracking.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project to get regions for')
    })
  )
  .output(
    z.object({
      regions: z
        .array(z.any())
        .describe('List of tracked regions with language and keyword counts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listRegions(ctx.input.projectName);
    let regions = Array.isArray(data) ? data : (data?.regions ?? []);

    return {
      output: { regions },
      message: `Found **${regions.length}** tracked region(s) for project **${ctx.input.projectName}**.`
    };
  })
  .build();
