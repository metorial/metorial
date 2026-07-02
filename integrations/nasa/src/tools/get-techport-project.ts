import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

export let getTechPortProject = SlateTool.create(spec, {
  name: 'Get TechPort Project',
  key: 'get_techport_project',
  description: `Retrieve details about a NASA technology development project from TechPort. Provides project metadata including title, description, status, responsible program, and last updated date. Can also list recently updated project IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().optional().describe('TechPort project ID to retrieve details for'),
      updatedSince: z
        .string()
        .optional()
        .describe(
          'List projects updated since this date (YYYY-MM-DD). Used when projectId is not specified.'
        )
    })
  )
  .output(
    z.object({
      project: z
        .record(z.string(), z.any())
        .optional()
        .describe('Full project details when looking up by ID'),
      projectIds: z
        .array(z.number())
        .optional()
        .describe('List of project IDs when searching by updated date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    if (ctx.input.projectId) {
      let result = await client.getTechPortProject(ctx.input.projectId);
      let project = result.project || result;
      return {
        output: { project },
        message: `Retrieved TechPort project **${project.title || project.projectId || ctx.input.projectId}**.`
      };
    }

    let result = await client.searchTechPortProjects({ updatedSince: ctx.input.updatedSince });
    let projectIds = (result.projects || result || []).map((p: any) =>
      typeof p === 'number' ? p : p.projectId
    );

    return {
      output: { projectIds },
      message: `Found **${projectIds.length}** TechPort projects${ctx.input.updatedSince ? ` updated since ${ctx.input.updatedSince}` : ''}.`
    };
  })
  .build();
