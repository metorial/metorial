import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let listPipelinesTool = SlateTool.create(spec, {
  name: 'List Pipelines',
  key: 'list_pipelines',
  description: `List pipelines in a project. Returns pipeline IDs and names which can be used to trigger runs or query run history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      top: z.number().optional().describe('Maximum number of pipelines to return')
    })
  )
  .output(
    z.object({
      pipelines: z.array(
        z.object({
          pipelineId: z.number(),
          pipelineName: z.string(),
          folder: z.string().optional(),
          revision: z.number().optional(),
          url: z.string().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project) throw new Error('Project is required.');

    let result = await client.listPipelines(project, { top: ctx.input.top });

    let pipelines = (result.value || []).map((p: any) => ({
      pipelineId: p.id,
      pipelineName: p.name,
      folder: p.folder,
      revision: p.revision,
      url: p._links?.web?.href || p.url
    }));

    return {
      output: { pipelines, count: pipelines.length },
      message: `Found **${pipelines.length}** pipelines in project "${project}".`
    };
  })
  .build();
