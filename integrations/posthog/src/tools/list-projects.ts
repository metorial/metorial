import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProjectsTool = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects accessible with the current credentials. Returns project IDs, names, and tokens needed for configuration.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Project ID'),
          name: z.string().describe('Project name'),
          apiToken: z.string().optional().describe('Project API token for event capture'),
          timezone: z.string().optional().describe('Project timezone'),
          isDemo: z.boolean().optional().describe('Whether this is a demo project')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listProjects();

    let projects = (data.results || []).map((p: any) => ({
      projectId: String(p.id),
      name: p.name,
      apiToken: p.api_token,
      timezone: p.timezone,
      isDemo: p.is_demo
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
